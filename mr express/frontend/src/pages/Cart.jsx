import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, CreditCard, Copy, Check } from 'lucide-react';
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
  'w-full rounded-xl border border-neutral-200 bg-white px-3.5 py-3 text-[15px] text-neutral-900 outline-none transition placeholder:text-neutral-400 focus:ring-2 focus:ring-ios-blue/25';

const CHECKOUT_SYSTEM_ERROR = "Tizimda vaqtincha uzilish, qayta urinib ko'ring";

function getApiBase() {
  const env = import.meta.env.VITE_API_URL;
  if (env && env !== 'same' && env !== '') return env.replace(/\/$/, '');
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

function buildOrderPayload(form) {
  const namePart = `${form.firstName} ${form.lastName}`.trim();
  const address = [namePart, form.viloyat, form.tuman].filter(Boolean).join(', ');
  return {
    address,
    phone: form.phone.trim(),
  };
}

async function submitOrderPayload(payload) {
  const body = JSON.stringify(payload);
  const res = await fetch(`${getApiBase()}/api/orders`, {
    method: 'POST',
    headers: getCheckoutHeaders(),
    body,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const error = new Error(err.detail || res.statusText || `HTTP ${res.status}`);
    error.status = res.status;
    throw error;
  }
  return res.json();
}

function getCheckoutErrorMessage(error) {
  const status = error?.status;
  if (status >= 500 || status === 0) return CHECKOUT_SYSTEM_ERROR;
  if (typeof error?.message === 'string' && /HTTP 5\d\d/i.test(error.message)) return CHECKOUT_SYSTEM_ERROR;
  return error?.message || CHECKOUT_SYSTEM_ERROR;
}

function formatCardFull(num) {
  const d = (num || '').replace(/\D/g, '');
  return d.replace(/(.{4})/g, '$1 ').trim();
}

function useCopy(text) {
  const [copied, setCopied] = useState(false);
  const copy = useCallback(() => {
    const raw = (text || '').replace(/\s/g, '');
    navigator.clipboard?.writeText(raw).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  }, [text]);
  return [copied, copy];
}

/**
 * To'lov kartasi ko'rinishi — to'liq raqam + egasi ismi + katta nusxa tugmasi
 */
function PaymentCard({ cardInfo, formattedCard, rawCard }) {
  const [cardCopied, copyCard] = useCopy(rawCard);
  const [holderCopied, copyHolder] = useCopy(cardInfo?.card_holder || '');

  return (
    <div className="space-y-2">
      {/* Karta vizuali */}
      <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f3460] p-5 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-widest text-white/50">
            {cardInfo?.bank_name || 'To\'lov kartasi'}
          </span>
          <CreditCard className="h-6 w-6 text-white/40" />
        </div>

        {/* Karta raqami — to'liq, aniq */}
        <p className="mb-1 text-[9px] uppercase tracking-widest text-white/40">Karta raqami</p>
        <p className="mb-4 font-mono text-[22px] font-bold tracking-[0.12em] text-white leading-none">
          {formattedCard}
        </p>

        {/* Karta egasi */}
        <div>
          <p className="text-[9px] uppercase tracking-widest text-white/40 mb-0.5">Karta egasi</p>
          <p className="text-base font-bold uppercase tracking-wide text-white">
            {cardInfo?.card_holder || '—'}
          </p>
        </div>
      </div>

      {/* Nusxa olish tugmalari — katta, aniq */}
      <button
        type="button"
        onClick={copyCard}
        className={`press-fluid flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-[15px] font-semibold transition-colors ${
          cardCopied
            ? 'bg-green-100 text-green-700'
            : 'bg-neutral-100 text-neutral-800'
        }`}
      >
        {cardCopied
          ? <><Check className="h-4 w-4" /> Karta raqami nusxa olindi!</>
          : <><Copy className="h-4 w-4" /> Karta raqamini nusxa olish</>}
      </button>

      {cardInfo?.card_holder && (
        <button
          type="button"
          onClick={copyHolder}
          className={`press-fluid flex w-full items-center justify-center gap-2 rounded-xl py-3 text-[14px] font-medium transition-colors ${
            holderCopied
              ? 'bg-green-100 text-green-700'
              : 'bg-neutral-50 text-neutral-600'
          }`}
        >
          {holderCopied
            ? <><Check className="h-3.5 w-3.5" /> Ism nusxa olindi!</>
            : <><Copy className="h-3.5 w-3.5" /> Karta egasi ismini nusxa olish</>}
        </button>
      )}
    </div>
  );
}

/**
 * Bitta modal, 2 sahifa:
 *  step=1 → yetkazib berish formasi
 *  step=2 → adminning to'lov kartasi
 */
function CheckoutModal({
  open, onClose, onOrderDone, cart, initialContact,
}) {
  const [step, setStep] = useState(1);
  const [entered, setEntered] = useState(false);

  // Forma holatlari
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [viloyat, setViloyat] = useState(REGION_NAMES[0]);
  const [tuman, setTuman] = useState(() => getDistrictsByRegion(REGION_NAMES[0])[0] ?? '');

  // Admin kartasi
  const [cardInfo, setCardInfo] = useState(null);
  const [cardLoading, setCardLoading] = useState(false);

  // Yuborish holati
  const [submitting, setSubmitting] = useState(false);

  const { haptic, tg } = useTelegram();
  const tumanlar = useMemo(() => getDistrictsByRegion(viloyat), [viloyat]);

  useEffect(() => {
    if (!open) { setEntered(false); setStep(1); return undefined; }
    setFirstName(initialContact?.firstName || '');
    setLastName(initialContact?.lastName || '');
    setPhone(initialContact?.phone || '');
    const dv = REGION_NAMES[0];
    setViloyat(dv);
    setTuman(getDistrictsByRegion(dv)[0] ?? '');
    const id = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleViloyatChange = (v) => {
    setViloyat(v);
    setTuman(getDistrictsByRegion(v)[0] ?? '');
  };

  const goToPayment = async (e) => {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim() || !phone.trim() || !viloyat || !tuman) {
      tg?.showAlert?.("Barcha maydonlarni to'ldiring");
      return;
    }
    haptic('medium');
    setCardLoading(true);
    try {
      const res = await fetch(`${getApiBase()}/api/payment-info`);
      const data = await res.json();
      setCardInfo(data);
    } catch {
      setCardInfo({ card_number: '', card_holder: '', bank_name: '' });
    } finally {
      setCardLoading(false);
    }
    setStep(2);
  };

  const handleConfirmPayment = async () => {
    setSubmitting(true);
    haptic('medium');
    try {
      const payload = buildOrderPayload(
        { firstName: firstName.trim(), lastName: lastName.trim(), phone: phone.trim(), viloyat, tuman },
      );
      const order = await submitOrderPayload(payload);
      haptic('success');
      onClose();
      tg?.showAlert?.(`✅ Buyurtma #${order.order_id} qabul qilindi!\nTo'lovni amalga oshirgandan so'ng operator siz bilan bog'lanadi.`);
      onOrderDone();
    } catch (e) {
      haptic('error');
      tg?.showAlert?.(getCheckoutErrorMessage(e));
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  const rawCard = (cardInfo?.card_number || '').replace(/\D/g, '');
  const formattedCard = formatCardFull(rawCard);
  const hasCard = rawCard.length >= 4;

  return (
    <div className="fixed inset-0 z-[60] flex flex-col justify-end">
      <button
        type="button"
        aria-label="Yopish"
        className={`absolute inset-0 bg-black/40 transition-opacity duration-300 ${entered ? 'opacity-100' : 'opacity-0'}`}
        onClick={onClose}
      />

      <div
        className={`relative flex max-h-[94dvh] flex-col overflow-hidden rounded-t-[22px] bg-white shadow-[0_-8px_36px_rgba(0,0,0,0.14)] transition-transform duration-300 ease-in-out ${entered ? 'translate-y-0' : 'translate-y-full'}`}
      >
        <div className="mx-auto mt-3 h-1 w-10 shrink-0 rounded-full bg-neutral-200" />

        {/* Header */}
        <div className="flex shrink-0 items-center gap-2 border-b border-neutral-100 px-4 py-3">
          <button
            type="button"
            onClick={step === 1 ? onClose : () => setStep(1)}
            className="press-fluid flex h-9 w-9 items-center justify-center rounded-full bg-neutral-100 text-neutral-700"
          >
            <ChevronLeft className="h-5 w-5" strokeWidth={2.25} />
          </button>
          <div className="flex-1">
            <h2 className="text-[17px] font-semibold text-neutral-900">
              {step === 1 ? 'Buyurtmani rasmiylashtirish' : "To'lov ma'lumotlari"}
            </h2>
            <div className="mt-1 flex items-center gap-1">
              <span className={`h-1.5 w-8 rounded-full transition-colors ${step >= 1 ? 'bg-ios-blue' : 'bg-neutral-200'}`} />
              <span className={`h-1.5 w-8 rounded-full transition-colors ${step >= 2 ? 'bg-ios-blue' : 'bg-neutral-200'}`} />
            </div>
          </div>
          <span className="text-xs font-medium text-neutral-400">{step} / 2</span>
        </div>

        {/* ─── 1-sahifa: Forma ─── */}
        {step === 1 && (
          <form onSubmit={goToPayment} className="flex flex-col overflow-hidden">
            <div className="scroll-area min-h-0 flex-1 space-y-3.5 px-4 py-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-neutral-500">Ism</label>
                <input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Ismingiz" className={INPUT_CLASS} autoComplete="given-name" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-neutral-500">Familiya</label>
                <input type="text" value={lastName} onChange={(e) => setLastName(e.target.value)}
                  placeholder="Familiyangiz" className={INPUT_CLASS} autoComplete="family-name" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-neutral-500">Telefon raqami</label>
                <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
                  placeholder="+998 90 123 45 67" className={INPUT_CLASS} autoComplete="tel" />
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
                disabled={cardLoading}
                className="press-fluid w-full rounded-xl bg-ios-blue py-3.5 text-[17px] font-semibold text-white shadow-glass disabled:opacity-50"
              >
                {cardLoading ? 'Yuklanmoqda...' : "Keyingi: To'lov →"}
              </button>
            </div>
          </form>
        )}

        {/* ─── 2-sahifa: Admin kartasi ─── */}
        {step === 2 && (
          <div className="flex flex-col overflow-hidden">
            <div className="scroll-area min-h-0 flex-1 px-4 py-4 space-y-4">

              {/* Buyurtma xulosa */}
              <div className="rounded-xl bg-neutral-50 px-4 py-3">
                <p className="text-xs font-medium text-neutral-500 mb-1">Buyurtma summasi</p>
                <p className="text-2xl font-bold text-neutral-900">{formatPrice(cart.total)}</p>
                <p className="text-xs text-neutral-400 mt-0.5">
                  {firstName} {lastName} · {viloyat}, {tuman}
                </p>
              </div>

              {/* Admin kartasi */}
              <div>
                <p className="mb-2 text-xs font-medium text-neutral-500">To'lov uchun karta</p>
                {hasCard
                  ? <PaymentCard cardInfo={cardInfo} formattedCard={formattedCard} rawCard={rawCard} />
                  : (
                    <div className="rounded-2xl bg-neutral-100 px-5 py-8 text-center">
                      <CreditCard className="mx-auto mb-2 h-8 w-8 text-neutral-300" />
                      <p className="text-sm text-neutral-500">Karta ma'lumotlari hali kiritilmagan</p>
                      <p className="text-xs text-neutral-400 mt-1">Admin panel → Sozlamalar</p>
                    </div>
                  )}
              </div>

              {hasCard && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                  <p className="text-[13px] font-semibold text-amber-800">📋 Ko'rsatma</p>
                  <p className="mt-1 text-[12px] leading-relaxed text-amber-700">
                    Yuqoridagi kartaga <strong>{formatPrice(cart.total)}</strong> o'tkazing va operator siz bilan bog'lanadi.
                  </p>
                </div>
              )}
            </div>

            <div className="shrink-0 border-t border-neutral-100 px-4 pb-[calc(env(safe-area-inset-bottom,16px)+12px)] pt-3">
              <button
                type="button"
                onClick={handleConfirmPayment}
                disabled={submitting}
                className="press-fluid w-full rounded-xl bg-ios-blue py-3.5 text-[17px] font-semibold text-white shadow-glass disabled:opacity-50"
              >
                {submitting ? 'Saqlanmoqda...' : "To'lovni tasdiqlash ✓"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function Cart() {
  const [cart, setCart] = useState({ items: [], total: 0 });
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const { refreshCart, user } = useApp();
  const { haptic } = useTelegram();
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

  const handleOrderDone = async () => {
    await load();
    navigate('/profile', { state: { openSection: 'orders' } });
  };

  if (!cart.items.length) {
    return (
      <div className="flex h-full flex-col items-center justify-center px-4 pb-nav-safe">
        <div className="glass rounded-squircle-lg px-10 py-8 text-center shadow-glass-lg">
          <IconCart active={false} />
          <h2 className="mt-4 text-xl font-bold text-neutral-900">Savatcha bo&apos;sh</h2>
          <p className="mt-2 text-sm text-ios-muted">Katalogdan mahsulot qo&apos;shing</p>
          <button type="button" onClick={() => navigate('/catalog')}
            className="press-fluid mt-6 rounded-squircle bg-ios-blue px-8 py-3.5 text-[15px] font-semibold text-white shadow-glass">
            Katalogga o&apos;tish
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div
        className={`scroll-area h-full px-4 pb-[calc(9.5rem+env(safe-area-inset-bottom,20px))] pt-3 ${checkoutOpen ? 'pointer-events-none opacity-0' : ''}`}
        aria-hidden={checkoutOpen}
      >
        <h1 className="mb-5 text-[28px] font-bold tracking-tight text-neutral-900">Savatcha</h1>
        <div className="space-y-3.5">
          {cart.items.map((item) => {
            const hasDiscount = item.product.old_price && item.product.old_price > item.product.price;
            return (
            <div key={item.cart_id} className="glass flex gap-3.5 rounded-squircle p-3.5 shadow-glass">
              {item.product.image_url ? (
                <img src={item.product.image_url} alt="" className="h-[76px] w-[76px] shrink-0 rounded-squircle object-cover" />
              ) : (
                <div className="flex h-[76px] w-[76px] shrink-0 items-center justify-center rounded-squircle bg-neutral-100 text-2xl">📦</div>
              )}
              <div className="flex min-w-0 flex-1 flex-col justify-between">
                <h3 className="line-clamp-2 text-sm font-semibold text-neutral-800">{item.product.name}</h3>
                <div>
                  <p className="text-sm font-bold text-ios-blue">{formatPrice(item.product.price)}</p>
                  {hasDiscount && (
                    <p className="text-[11px] text-neutral-400 line-through">{formatPrice(item.product.old_price)}</p>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <button type="button" onClick={() => updateQty(item.product.id, item.quantity - 1)}
                    className="press-fluid glass-subtle flex h-8 w-8 items-center justify-center rounded-full text-lg font-medium text-neutral-700">−</button>
                  <span className="w-4 text-center text-sm font-semibold">{item.quantity}</span>
                  <button type="button" onClick={() => updateQty(item.product.id, item.quantity + 1)}
                    className="press-fluid glass-subtle flex h-8 w-8 items-center justify-center rounded-full text-lg font-medium text-neutral-700">+</button>
                </div>
              </div>
              <p className="shrink-0 text-sm font-bold text-neutral-800">{formatPrice(item.subtotal)}</p>
            </div>
          );
          })}
        </div>
      </div>

      {!checkoutOpen && (
        <div className="fixed bottom-[calc(5.75rem+env(safe-area-inset-bottom,20px))] left-0 right-0 mx-4 w-[calc(100%-32px)]">
          <div className="glass-float p-4">
            <div className="mb-3 flex justify-between">
              <span className="text-sm font-medium text-ios-muted">Jami</span>
              <span className="text-xl font-bold tracking-tight text-neutral-900">{formatPrice(cart.total)}</span>
            </div>
            <button type="button" onClick={openCheckout}
              className="press-fluid w-full rounded-squircle bg-ios-blue py-3.5 text-[17px] font-semibold text-white shadow-glass">
              Buyurtmani rasmiylashtirish
            </button>
          </div>
        </div>
      )}

      <CheckoutModal
        open={checkoutOpen}
        onClose={() => setCheckoutOpen(false)}
        onOrderDone={handleOrderDone}
        cart={cart}
        initialContact={{ firstName: user?.first_name, lastName: user?.last_name, phone: user?.phone }}
      />
    </>
  );
}
