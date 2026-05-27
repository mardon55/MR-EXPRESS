import { useCallback, useEffect, useState } from 'react';
import { resolveUrl } from '../../utils/resolveUrl';
import { Flame, Moon, ShoppingCart, Sparkles, Sun, Timer } from 'lucide-react';
import { api } from '../../api';
import { useTelegram } from '../../hooks/useTelegram';
import PageHeader from '../PageHeader';

// ── Vaqt yordamchi funksiyalar ──────────────────────────────────────────────

function isNightMarketActive(date = new Date()) {
  const h = date.getHours();
  const m = date.getMinutes();
  if (h >= 22) return true;
  if (h < 2) return true;
  if (h === 2 && m === 0) return true;
  return false;
}

function getNextOpenTime(now = new Date()) {
  const t = new Date(now);
  t.setHours(22, 0, 0, 0);
  if (now < t) return t;
  t.setDate(t.getDate() + 1);
  t.setHours(22, 0, 0, 0);
  return t;
}

function getNextCloseTime(now = new Date()) {
  const t = new Date(now);
  if (now.getHours() >= 22) t.setDate(t.getDate() + 1);
  t.setHours(2, 0, 0, 0);
  if (t <= now) { t.setDate(t.getDate() + 1); t.setHours(2, 0, 0, 0); }
  return t;
}

function formatHMS(ms) {
  if (ms <= 0) return '00:00:00';
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const mn = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const p = (n) => String(n).padStart(2, '0');
  return `${p(h)}:${p(mn)}:${p(sec)}`;
}

function formatHM(ms) {
  if (ms <= 0) return '0 soat 0 daqiqa';
  const dm = Math.ceil(ms / 60000);
  return `${Math.floor(dm / 60)} soat ${dm % 60} daqiqa`;
}

function calcNightPrice(dayPrice, pct) {
  return Math.round(dayPrice * (1 - pct / 100));
}

function stockLabel(total, sold) {
  const left = Math.max(0, total - sold);
  if (left <= 5) return `Faqat ${left} ta qoldi!`;
  return `${Math.min(100, Math.round((sold / total) * 100))}% sotildi`;
}

// ── Soat holati (har soniya) ─────────────────────────────────────────────────

function useNightMarketClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  const faol = isNightMarketActive(now);
  const ochMs = faol ? null : getNextOpenTime(now).getTime() - now.getTime();
  const yopMs = faol ? getNextCloseTime(now).getTime() - now.getTime() : null;
  return {
    faol,
    ochilishMatn: ochMs != null ? formatHM(ochMs) : '',
    yopilishMatn: yopMs != null ? formatHMS(yopMs) : '00:00:00',
  };
}

// ── Countdown banner ─────────────────────────────────────────────────────────

function CountdownBanner({ faol, ochilishMatn, yopilishMatn }) {
  if (faol) {
    return (
      <div className="rounded-2xl border px-4 py-3 text-center"
        style={{
          borderColor: 'rgba(255,0,127,0.55)',
          background: 'rgba(255,0,127,0.08)',
          boxShadow: '0 0 24px rgba(255,0,127,0.35), inset 0 0 12px rgba(0,240,255,0.06)',
        }}>
        <p className="flex items-center justify-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide"
          style={{ color: '#FF007F', textShadow: '0 0 8px rgba(255,0,127,0.8)' }}>
          <Flame className="h-3.5 w-3.5" strokeWidth={2.5} />
          Tungi bozor yopilishiga qoldi
        </p>
        <p className="mt-1 font-mono text-[26px] font-bold tabular-nums"
          style={{ color: '#FF4D6D', textShadow: '0 0 16px rgba(255,0,127,0.9)' }}>
          {yopilishMatn}
        </p>
      </div>
    );
  }
  return (
    <div className="rounded-2xl border px-4 py-3 text-center"
      style={{
        borderColor: 'rgba(0,240,255,0.35)',
        background: 'rgba(0,240,255,0.05)',
        boxShadow: '0 0 20px rgba(0,240,255,0.15)',
      }}>
      <p className="flex items-center justify-center gap-1.5 text-[11px] font-medium text-[#8B9BB4]">
        <Timer className="h-3.5 w-3.5 text-[#00F0FF]" strokeWidth={2.25} />
        Tungi bozor ochilishiga
      </p>
      <p className="mt-1 text-[15px] font-bold leading-snug"
        style={{ color: '#C8D4E8', textShadow: '0 0 10px rgba(0,240,255,0.4)' }}>
        {ochilishMatn} qoldi
      </p>
      <p className="mt-1 text-[10px] text-[#6B7A90]">Har kuni soat 22:00 da ochiladi</p>
    </div>
  );
}

// ── Mahsulot kartasi ─────────────────────────────────────────────────────────

function NightProductCard({ mahsulot, faol, onBuy, buyingId }) {
  const tungiNarx = calcNightPrice(mahsulot.day_price, mahsulot.night_discount_percent);
  const sotilganFoiz = Math.min(100, Math.round((mahsulot.sold_count / mahsulot.total_stock) * 100));
  const bloklangan = !faol;
  const yuklanmoqda = buyingId === mahsulot.id;

  return (
    <article
      className={`relative overflow-hidden rounded-2xl border p-3 transition-opacity ${bloklangan ? 'opacity-55 grayscale' : ''}`}
      style={{
        borderColor: faol ? 'rgba(138,43,226,0.45)' : 'rgba(100,116,139,0.35)',
        background: 'rgba(15,17,28,0.95)',
        boxShadow: faol ? '0 0 20px rgba(0,240,255,0.12), 0 0 32px rgba(255,0,127,0.08)' : 'none',
      }}>
      {bloklangan && (
        <span className="absolute right-2 top-2 z-10 rounded-md bg-[#1E2230] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#64748B]">
          Bloklangan
        </span>
      )}
      <div className="flex gap-3">
        {mahsulot.image_url ? (
          <img src={resolveUrl(mahsulot.image_url)} alt=""
            className="h-[72px] w-[72px] shrink-0 rounded-xl object-cover ring-1 ring-[#2A2F45]" />
        ) : (
          <div className="flex h-[72px] w-[72px] shrink-0 items-center justify-center rounded-xl bg-[#1E2230] ring-1 ring-[#2A2F45]">
            <Moon className="h-7 w-7 text-[#64748B]" strokeWidth={1.5} />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h4 className="line-clamp-2 text-[13px] font-semibold leading-snug"
            style={{
              color: faol ? '#E8ECFF' : '#94A3B8',
              textShadow: faol ? '0 0 12px rgba(0,240,255,0.25)' : 'none',
            }}>
            {mahsulot.name}
          </h4>
          <div className="mt-1 flex flex-wrap items-baseline gap-2">
            <span className="text-[11px] line-through text-[#64748B]">
              {mahsulot.day_price.toLocaleString('uz-UZ')} so&apos;m
            </span>
            {faol && (
              <span className="rounded px-1.5 py-0.5 text-[10px] font-bold"
                style={{ background: 'rgba(255,0,127,0.2)', color: '#FF007F', boxShadow: '0 0 8px rgba(255,0,127,0.4)' }}>
                -{mahsulot.night_discount_percent}%
              </span>
            )}
          </div>
          <p className="mt-0.5 text-[16px] font-bold"
            style={{
              color: faol ? '#00F0FF' : '#64748B',
              textShadow: faol ? '0 0 10px rgba(0,240,255,0.5)' : 'none',
            }}>
            {tungiNarx.toLocaleString('uz-UZ')} so&apos;m
          </p>
          {!faol && (
            <p className="text-[10px] text-[#64748B]">
              Tunda -{mahsulot.night_discount_percent}% · taxminiy narx
            </p>
          )}
        </div>
      </div>

      <div className="mt-2.5">
        <div className="mb-1 flex items-center justify-between gap-2">
          <span className="flex items-center gap-1 text-[10px] font-medium text-[#8B9BB4]">
            <Sparkles className="h-3 w-3 text-[#00F0FF]" strokeWidth={2.25} />
            {stockLabel(mahsulot.total_stock, mahsulot.sold_count)}
          </span>
          <span className="text-[10px] font-semibold text-[#A78BFA]">{sotilganFoiz}%</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-[#1E2230]"
          role="progressbar" aria-valuenow={sotilganFoiz} aria-valuemin={0} aria-valuemax={100}>
          <div className="h-full rounded-full transition-[width] duration-700 ease-out"
            style={{
              width: `${sotilganFoiz}%`,
              background: faol ? 'linear-gradient(90deg,#7C3AED,#FF007F,#00F0FF)' : '#475569',
              boxShadow: faol ? '0 0 8px rgba(0,240,255,0.5)' : 'none',
            }} />
        </div>
      </div>

      <button
        type="button"
        disabled={bloklangan || yuklanmoqda}
        onClick={() => onBuy(mahsulot)}
        className="mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-xl py-2.5 text-[12px] font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-40"
        style={faol
          ? { background: 'linear-gradient(135deg,#7C3AED 0%,#FF007F 50%,#00F0FF 100%)', color: '#0B0C10', boxShadow: '0 0 20px rgba(255,0,127,0.45)' }
          : { background: '#1E2230', color: '#64748B' }}>
        <ShoppingCart className="h-4 w-4" strokeWidth={2.25} />
        {bloklangan ? 'Tungi bozor yopiq' : yuklanmoqda ? "Qo'shilmoqda..." : "Savatchaga qo'shish"}
      </button>
    </article>
  );
}

// ── Asosiy komponent ─────────────────────────────────────────────────────────

export default function NightMarket({ onBack }) {
  const { haptic, tg } = useTelegram();
  const { faol, ochilishMatn, yopilishMatn } = useNightMarketClock();
  const [mahsulotlar, setMahsulotlar] = useState([]);
  const [loading, setLoading] = useState(true);
  const [buyingId, setBuyingId] = useState(null);

  const loadProducts = useCallback(async () => {
    try {
      const res = await fetch('/api/night-market');
      const data = await res.json();
      setMahsulotlar(Array.isArray(data) ? data : []);
    } catch {
      setMahsulotlar([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProducts();
    const id = setInterval(loadProducts, 10000);
    return () => clearInterval(id);
  }, [loadProducts]);

  const handleBuy = useCallback(async (mahsulot) => {
    if (!isNightMarketActive()) {
      tg?.showAlert?.('Tungi bozor hozir yopiq. Soat 22:00 da qayta ochiladi.');
      return;
    }
    setBuyingId(mahsulot.id);
    try {
      const res = await api.buyNightMarketItem(mahsulot.id);
      haptic?.('success');
      const nightPrice = res?.price ?? Math.round(mahsulot.day_price * (1 - mahsulot.night_discount_percent / 100));
      tg?.showAlert?.(
        `✅ Buyurtma qabul qilindi!\n${mahsulot.name}\n${nightPrice.toLocaleString('uz-UZ')} so'm\n\nYaqin orada yetkaziladi 🚚`
      );
      setMahsulotlar((prev) =>
        prev.map((p) =>
          p.id === mahsulot.id && p.sold_count < p.total_stock
            ? { ...p, sold_count: p.sold_count + 1 }
            : p
        )
      );
    } catch (err) {
      haptic?.('light');
      const msg = err?.message || String(err);
      if (msg.includes('tugab')) {
        tg?.showAlert?.('Kechirasiz, bu mahsulot tugab ketdi!');
      } else {
        tg?.showAlert?.(`Xato: ${msg}`);
      }
    } finally {
      setBuyingId(null);
    }
  }, [haptic, tg]);

  return (
    <div className="flex h-full flex-col" style={{ backgroundColor: faol ? '#0B0C10' : '#111318' }}>
      <div style={{ paddingTop: '50px' }} className="shrink-0">
        <PageHeader title="Tungi bozor" onBack={onBack} showLabel />
      </div>

      <div className="scroll-area min-h-0 flex-1 px-4 pb-6 pt-2">
        <header className="mb-3 text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-2xl border"
            style={{
              borderColor: faol ? 'rgba(0,240,255,0.4)' : 'rgba(148,163,184,0.3)',
              background: faol ? 'rgba(124,58,237,0.15)' : 'rgba(30,34,48,0.8)',
              boxShadow: faol ? '0 0 24px rgba(124,58,237,0.35)' : 'none',
            }}>
            {faol
              ? <Moon className="h-6 w-6" style={{ color: '#00F0FF', filter: 'drop-shadow(0 0 8px #00F0FF)' }} strokeWidth={2} />
              : <Sun className="h-6 w-6 text-[#94A3B8]" strokeWidth={2} />}
          </div>
          <h2 className="text-[18px] font-bold"
            style={{
              color: faol ? '#E8ECFF' : '#94A3B8',
              textShadow: faol ? '0 0 20px rgba(255,0,127,0.5),0 0 12px rgba(0,240,255,0.35)' : 'none',
            }}>
            {faol ? 'Night Flash Sales' : 'Tungi bozor yopiq'}
          </h2>
          <p className="mt-1 text-[11px] text-[#8B9BB4]">
            {faol ? 'Cheklangan zaxira · tungi chegirma' : "Bugungi tunda chegirmadagi tovarlar (oldindan ko'rish)"}
          </p>
          <span className="mt-2 inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase"
            style={faol
              ? { background: 'rgba(255,0,127,0.15)', color: '#FF007F', boxShadow: '0 0 12px rgba(255,0,127,0.35)' }
              : { background: 'rgba(100,116,139,0.2)', color: '#94A3B8' }}>
            {faol ? <><Flame className="h-3 w-3" strokeWidth={2.5} />Faol</> : <><Moon className="h-3 w-3" strokeWidth={2.25} />Yopiq</>}
          </span>
        </header>

        <CountdownBanner faol={faol} ochilishMatn={ochilishMatn} yopilishMatn={yopilishMatn} />

        <p className="mb-2 mt-4 text-[11px] font-semibold uppercase tracking-wider"
          style={{ color: faol ? '#A78BFA' : '#64748B' }}>
          {faol ? 'Hozir sotib olish mumkin' : 'Bugungi tungi tovarlar'}
        </p>

        {loading ? (
          <div className="flex justify-center py-10">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#00F0FF] border-t-transparent" />
          </div>
        ) : mahsulotlar.length === 0 ? (
          <div className="rounded-2xl border px-4 py-10 text-center"
            style={{ borderColor: 'rgba(100,116,139,0.3)', background: 'rgba(30,34,48,0.6)' }}>
            <Moon className="mx-auto h-10 w-10 text-[#64748B]" strokeWidth={1.5} />
            <p className="mt-3 text-[14px] font-semibold text-[#94A3B8]">Hozircha mahsulot yo&apos;q</p>
            <p className="mt-1 text-[11px] text-[#64748B]">Admin tez orada mahsulot qo&apos;shadi</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {mahsulotlar.map((m) => (
              <li key={m.id}>
                <NightProductCard mahsulot={m} faol={faol} onBuy={handleBuy} buyingId={buyingId} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
