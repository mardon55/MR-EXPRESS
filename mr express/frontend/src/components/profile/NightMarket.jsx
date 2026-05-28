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
  return (
    <div className="flex h-full flex-col bg-theme-bg">
      <div style={{ paddingTop: '50px' }} className="shrink-0">
        <PageHeader title="Tungi bozor" onBack={onBack} showLabel />
      </div>
      <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-theme-icon shadow-theme-sm">
          <span className="text-4xl">🔒</span>
        </div>
        <p className="mt-5 text-[17px] font-bold text-theme">Bu bo&apos;lim hozircha muzlatilgan</p>
        <p className="mt-2 max-w-[240px] text-[13px] leading-relaxed text-theme-muted">
          Yaqin orada ishga tushiriladi. Kuting!
        </p>
      </div>
    </div>
  );
}
