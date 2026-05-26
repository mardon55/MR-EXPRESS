import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Flame,
  Moon,
  ShoppingCart,
  Sparkles,
  Sun,
  Timer,
} from 'lucide-react';
import { api } from '../../api';
import { useApp } from '../../context/AppContext';
import { useTelegram } from '../../hooks/useTelegram';
import PageHeader from '../PageHeader';

// ——— Tungi bozor vaqt oynasi: har kuni 22:00 dan 02:00 gacha (02:00 daqiqasi ham kiradi) ———

/** Joriy vaqt tungi bozor faoliyatida ekanini tekshiradi (22:00 – 02:00) */
function isNightMarketActive(date = new Date()) {
  const soat = date.getHours();
  const daqiqa = date.getMinutes();
  // Kechki 22:00 dan yarim tungi 02:00 gacha — faol
  if (soat >= 22) return true;
  if (soat < 2) return true;
  if (soat === 2 && daqiqa === 0) return true;
  return false;
}

/** Keyingi tungi bozor ochilish vaqtini (Date) qaytaradi — kunduzgi yopiq holat uchun (22:00) */
function getNextOpenTime(now = new Date()) {
  const ochilish = new Date(now);
  ochilish.setHours(22, 0, 0, 0);
  if (now < ochilish) {
    return ochilish;
  }
  ochilish.setDate(ochilish.getDate() + 1);
  ochilish.setHours(22, 0, 0, 0);
  return ochilish;
}

/** Keyingi tungi bozor yopilish vaqtini (Date) qaytaradi — faol tunda 02:00 */
function getNextCloseTime(now = new Date()) {
  const yopilish = new Date(now);
  if (now.getHours() >= 22) {
    yopilish.setDate(yopilish.getDate() + 1);
  }
  yopilish.setHours(2, 0, 0, 0);
  if (yopilish <= now) {
    yopilish.setDate(yopilish.getDate() + 1);
    yopilish.setHours(2, 0, 0, 0);
  }
  return yopilish;
}

/** Millisekundlarni HH:MM:SS ko'rinishiga aylantiradi (faol tungi taymer) */
function formatHMS(ms) {
  if (ms <= 0) return '00:00:00';
  const jamiSek = Math.floor(ms / 1000);
  const h = Math.floor(jamiSek / 3600);
  const m = Math.floor((jamiSek % 3600) / 60);
  const s = jamiSek % 60;
  const toldir = (n) => String(n).padStart(2, '0');
  return `${toldir(h)}:${toldir(m)}:${toldir(s)}`;
}

/** Millisekundlarni "X soat Y daqiqa" ko'rinishiga aylantiradi (ochilishgacha taymer) */
function formatHoursMinutes(ms) {
  if (ms <= 0) return '0 soat 0 daqiqa';
  const jamiDaqiqa = Math.ceil(ms / 60000);
  const soat = Math.floor(jamiDaqiqa / 60);
  const daqiqa = jamiDaqiqa % 60;
  return `${soat} soat ${daqiqa} daqiqa`;
}

/** Test uchun mock mahsulotlar — kunduzgi narx, tungi chegirma foizi, zaxira */
const NIGHT_PRODUCTS = [
  {
    id: 'nm-1',
    name: 'Bluetooth quloqchin Pro TWS',
    image:
      'https://images.unsplash.com/photo-1590658268037-6bf12f032a33?w=400&h=400&fit=crop',
    dayPrice: 349_000,
    nightDiscountPercent: 40,
    totalStock: 20,
    soldCount: 16,
  },
  {
    id: 'nm-2',
    name: 'Smart soat — AMOLED 46mm',
    image:
      'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=400&fit=crop',
    dayPrice: 589_000,
    nightDiscountPercent: 35,
    totalStock: 12,
    soldCount: 7,
  },
  {
    id: 'nm-3',
    name: 'Portativ mini proyektor 4K',
    image:
      'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=400&h=400&fit=crop',
    dayPrice: 1_290_000,
    nightDiscountPercent: 50,
    totalStock: 8,
    soldCount: 6,
  },
  {
    id: 'nm-4',
    name: 'Elektr skuter — 25 km masofa',
    image:
      'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=400&fit=crop',
    dayPrice: 4_890_000,
    nightDiscountPercent: 30,
    totalStock: 5,
    soldCount: 4,
  },
];

/** Tungi narxni kunduzgi narxdan chegirma foizi bo'yicha hisoblaydi */
function calcNightPrice(dayPrice, discountPercent) {
  return Math.round(dayPrice * (1 - discountPercent / 100));
}

/** Zaxira progress matni — qolgan dona yoki sotilgan foiz */
function stockLabel(totalStock, soldCount) {
  const qolgan = Math.max(0, totalStock - soldCount);
  const foizSotildi = Math.min(100, Math.round((soldCount / totalStock) * 100));
  if (qolgan <= 5) {
    return `Faqat ${qolgan} ta qoldi!`;
  }
  return `${foizSotildi}% sotildi`;
}

/** Har soniya yangilanadigan vaqt holati — ochiq/yopiq va taymer matnlari */
function useNightMarketClock() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const faol = isNightMarketActive(now);

  const ochilishgacha = useMemo(() => {
    if (faol) return null;
    const keyingi = getNextOpenTime(now);
    return keyingi.getTime() - now.getTime();
  }, [faol, now]);

  const yopilishgacha = useMemo(() => {
    if (!faol) return null;
    const keyingi = getNextCloseTime(now);
    return keyingi.getTime() - now.getTime();
  }, [faol, now]);

  return {
    faol,
    ochilishMatn: ochilishgacha != null ? formatHoursMinutes(ochilishgacha) : '',
    yopilishMatn: yopilishgacha != null ? formatHMS(yopilishgacha) : '00:00:00',
  };
}

/** Neon konturli taymer bloki — kunduz (kulrang) yoki tunda (qizil neon) */
function CountdownBanner({ faol, ochilishMatn, yopilishMatn }) {
  if (faol) {
    return (
      <div
        className="rounded-2xl border px-4 py-3 text-center"
        style={{
          borderColor: 'rgba(255, 0, 127, 0.55)',
          background: 'rgba(255, 0, 127, 0.08)',
          boxShadow: '0 0 24px rgba(255, 0, 127, 0.35), inset 0 0 12px rgba(0, 240, 255, 0.06)',
        }}
      >
        <p
          className="flex items-center justify-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide"
          style={{ color: '#FF007F', textShadow: '0 0 8px rgba(255, 0, 127, 0.8)' }}
        >
          <Flame className="h-3.5 w-3.5" strokeWidth={2.5} />
          Tungi bozor yopilishiga qoldi
        </p>
        <p
          className="mt-1 font-mono text-[26px] font-bold tabular-nums"
          style={{ color: '#FF4D6D', textShadow: '0 0 16px rgba(255, 0, 127, 0.9)' }}
        >
          {yopilishMatn}
        </p>
      </div>
    );
  }

  return (
    <div
      className="rounded-2xl border px-4 py-3 text-center"
      style={{
        borderColor: 'rgba(0, 240, 255, 0.35)',
        background: 'rgba(0, 240, 255, 0.05)',
        boxShadow: '0 0 20px rgba(0, 240, 255, 0.15)',
      }}
    >
      <p className="flex items-center justify-center gap-1.5 text-[11px] font-medium text-[#8B9BB4]">
        <Timer className="h-3.5 w-3.5 text-[#00F0FF]" strokeWidth={2.25} />
        Tungi bozor ochilishiga
      </p>
      <p
        className="mt-1 text-[15px] font-bold leading-snug"
        style={{ color: '#C8D4E8', textShadow: '0 0 10px rgba(0, 240, 255, 0.4)' }}
      >
        {ochilishMatn} qoldi
      </p>
      <p className="mt-1 text-[10px] text-[#6B7A90]">Har kuni soat 22:00 da ochiladi</p>
    </div>
  );
}

/** Bitta mahsulot kartochkasi — progress, narx, sotib olish */
function NightProductCard({ mahsulot, faol, onBuy, buyingId }) {
  const tungiNarx = calcNightPrice(mahsulot.dayPrice, mahsulot.nightDiscountPercent);
  const sotilganFoiz = Math.min(100, Math.round((mahsulot.soldCount / mahsulot.totalStock) * 100));
  const bloklangan = !faol;
  const sotibOlishYuklanmoqda = buyingId === mahsulot.id;

  return (
    <article
      className={`relative overflow-hidden rounded-2xl border p-3 transition-opacity ${
        bloklangan ? 'opacity-55 grayscale' : ''
      }`}
      style={{
        borderColor: faol ? 'rgba(138, 43, 226, 0.45)' : 'rgba(100, 116, 139, 0.35)',
        background: 'rgba(15, 17, 28, 0.95)',
        boxShadow: faol
          ? '0 0 20px rgba(0, 240, 255, 0.12), 0 0 32px rgba(255, 0, 127, 0.08)'
          : 'none',
      }}
    >
      {bloklangan && (
        <span className="absolute right-2 top-2 z-10 rounded-md bg-[#1E2230] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#64748B]">
          Bloklangan
        </span>
      )}

      <div className="flex gap-3">
        <img
          src={mahsulot.image}
          alt=""
          className="h-[72px] w-[72px] shrink-0 rounded-xl object-cover ring-1 ring-[#2A2F45]"
        />
        <div className="min-w-0 flex-1">
          <h4
            className="line-clamp-2 text-[13px] font-semibold leading-snug"
            style={{
              color: faol ? '#E8ECFF' : '#94A3B8',
              textShadow: faol ? '0 0 12px rgba(0, 240, 255, 0.25)' : 'none',
            }}
          >
            {mahsulot.name}
          </h4>
          <div className="mt-1 flex flex-wrap items-baseline gap-2">
            <span
              className="text-[11px] line-through text-[#64748B]"
              aria-hidden={faol}
            >
              {mahsulot.dayPrice.toLocaleString('uz-UZ')} so&apos;m
            </span>
            {faol && (
              <span
                className="rounded px-1.5 py-0.5 text-[10px] font-bold"
                style={{
                  background: 'rgba(255, 0, 127, 0.2)',
                  color: '#FF007F',
                  boxShadow: '0 0 8px rgba(255, 0, 127, 0.4)',
                }}
              >
                -{mahsulot.nightDiscountPercent}%
              </span>
            )}
          </div>
          <p
            className="mt-0.5 text-[16px] font-bold"
            style={{
              color: faol ? '#00F0FF' : '#64748B',
              textShadow: faol ? '0 0 10px rgba(0, 240, 255, 0.5)' : 'none',
            }}
          >
            {tungiNarx.toLocaleString('uz-UZ')} so&apos;m
          </p>
          {!faol && (
            <p className="text-[10px] text-[#64748B]">
              Tunda -{mahsulot.nightDiscountPercent}% · taxminiy narx
            </p>
          )}
        </div>
      </div>

      <div className="mt-2.5">
        <div className="mb-1 flex items-center justify-between gap-2">
          <span className="flex items-center gap-1 text-[10px] font-medium text-[#8B9BB4]">
            <Sparkles className="h-3 w-3 text-[#00F0FF]" strokeWidth={2.25} />
            {stockLabel(mahsulot.totalStock, mahsulot.soldCount)}
          </span>
          <span className="text-[10px] font-semibold text-[#A78BFA]">{sotilganFoiz}%</span>
        </div>
        <div
          className="h-1.5 overflow-hidden rounded-full bg-[#1E2230]"
          role="progressbar"
          aria-valuenow={sotilganFoiz}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className="h-full rounded-full transition-[width] duration-700 ease-out"
            style={{
              width: `${sotilganFoiz}%`,
              background: faol
                ? 'linear-gradient(90deg, #7C3AED, #FF007F, #00F0FF)'
                : '#475569',
              boxShadow: faol ? '0 0 8px rgba(0, 240, 255, 0.5)' : 'none',
            }}
          />
        </div>
      </div>

      <button
        type="button"
        disabled={bloklangan || sotibOlishYuklanmoqda}
        onClick={() => onBuy(mahsulot)}
        className="mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-xl py-2.5 text-[12px] font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-40"
        style={
          faol
            ? {
                background: 'linear-gradient(135deg, #7C3AED 0%, #FF007F 50%, #00F0FF 100%)',
                color: '#0B0C10',
                boxShadow: '0 0 20px rgba(255, 0, 127, 0.45)',
              }
            : {
                background: '#1E2230',
                color: '#64748B',
              }
        }
      >
        <ShoppingCart className="h-4 w-4" strokeWidth={2.25} />
        {bloklangan
          ? 'Tungi bozor yopiq'
          : sotibOlishYuklanmoqda
            ? 'Qo\'shilmoqda...'
            : 'Savatchaga qo\'shish'}
      </button>
    </article>
  );
}

/**
 * Tungi bozor (Night Flash Sales) — profil ichidagi alohida bo'lim.
 * Telegram Mini App xavfsiz hududi: padding-top 50px.
 */
export default function NightMarket({ onBack }) {
  const { refreshCart } = useApp();
  const { haptic, tg } = useTelegram();
  const { faol, ochilishMatn, yopilishMatn } = useNightMarketClock();
  const [mahsulotlar, setMahsulotlar] = useState(NIGHT_PRODUCTS);
  const [buyingId, setBuyingId] = useState(null);

  /** Mock mahsulotni savatchaga qo'shish — API muvaffaqiyatsiz bo'lsa demo xabar */
  const handleBuy = useCallback(
    async (mahsulot) => {
      if (!isNightMarketActive()) {
        tg?.showAlert?.('Tungi bozor hozir yopiq. Soat 22:00 da qayta ochiladi.');
        return;
      }
      setBuyingId(mahsulot.id);
      try {
        const cart = await api.cart().catch(() => ({ items: [] }));
        const mavjud = cart.items?.find((i) => String(i.product?.id) === mahsulot.id);
        await api.updateCart(mahsulot.id, (mavjud?.quantity || 0) + 1);
        await refreshCart();
        haptic?.('success');
        tg?.showAlert?.(`${mahsulot.name} savatchaga qo'shildi!`);
        setMahsulotlar((prev) =>
          prev.map((p) =>
            p.id === mahsulot.id && p.soldCount < p.totalStock
              ? { ...p, soldCount: p.soldCount + 1 }
              : p
          )
        );
      } catch {
        haptic?.('light');
        tg?.showAlert?.(
          `Demo: "${mahsulot.name}" tungi narxda band qilindi. Tez orada to'liq ulanadi.`
        );
        setMahsulotlar((prev) =>
          prev.map((p) =>
            p.id === mahsulot.id && p.soldCount < p.totalStock
              ? { ...p, soldCount: p.soldCount + 1 }
              : p
          )
        );
      } finally {
        setBuyingId(null);
      }
    },
    [haptic, refreshCart, tg]
  );

  return (
    <div
      className="flex h-full flex-col"
      style={{ backgroundColor: faol ? '#0B0C10' : '#111318' }}
    >
      {/* Telegram "X" tugmasi ostidagi xavfsiz hudud — 50px tepa padding */}
      <div style={{ paddingTop: '50px' }} className="shrink-0">
        <PageHeader title="Tungi bozor" onBack={onBack} showLabel />
      </div>

      <div className="scroll-area min-h-0 flex-1 px-4 pb-6 pt-2">
        {/* Sarlavha — tunda neon, kunduz och kulrang */}
        <header className="mb-3 text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-2xl border"
            style={{
              borderColor: faol ? 'rgba(0, 240, 255, 0.4)' : 'rgba(148, 163, 184, 0.3)',
              background: faol ? 'rgba(124, 58, 237, 0.15)' : 'rgba(30, 34, 48, 0.8)',
              boxShadow: faol ? '0 0 24px rgba(124, 58, 237, 0.35)' : 'none',
            }}
          >
            {faol ? (
              <Moon
                className="h-6 w-6"
                style={{ color: '#00F0FF', filter: 'drop-shadow(0 0 8px #00F0FF)' }}
                strokeWidth={2}
              />
            ) : (
              <Sun className="h-6 w-6 text-[#94A3B8]" strokeWidth={2} />
            )}
          </div>
          <h2
            className="text-[18px] font-bold"
            style={{
              color: faol ? '#E8ECFF' : '#94A3B8',
              textShadow: faol
                ? '0 0 20px rgba(255, 0, 127, 0.5), 0 0 12px rgba(0, 240, 255, 0.35)'
                : 'none',
            }}
          >
            {faol ? 'Night Flash Sales' : 'Tungi bozor yopiq'}
          </h2>
          <p className="mt-1 text-[11px] text-[#8B9BB4]">
            {faol
              ? 'Cheklangan zaxira · 30–50% tungi chegirma'
              : 'Bugungi tunda chegirmadagi tovarlar (oldindan ko\'rish)'}
          </p>
          <span
            className="mt-2 inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase"
            style={
              faol
                ? {
                    background: 'rgba(255, 0, 127, 0.15)',
                    color: '#FF007F',
                    boxShadow: '0 0 12px rgba(255, 0, 127, 0.35)',
                  }
                : {
                    background: 'rgba(100, 116, 139, 0.2)',
                    color: '#94A3B8',
                  }
            }
          >
            {faol ? (
              <>
                <Flame className="h-3 w-3" strokeWidth={2.5} />
                Faol
              </>
            ) : (
              <>
                <Moon className="h-3 w-3" strokeWidth={2.25} />
                Yopiq
              </>
            )}
          </span>
        </header>

        <CountdownBanner
          faol={faol}
          ochilishMatn={ochilishMatn}
          yopilishMatn={yopilishMatn}
        />

        <p
          className="mb-2 mt-4 text-[11px] font-semibold uppercase tracking-wider"
          style={{ color: faol ? '#A78BFA' : '#64748B' }}
        >
          {faol ? 'Hozir sotib olish mumkin' : 'Bugungi tungi tovarlar'}
        </p>

        <ul className="space-y-3">
          {mahsulotlar.map((m) => (
            <li key={m.id}>
              <NightProductCard
                mahsulot={m}
                faol={faol}
                onBuy={handleBuy}
                buyingId={buyingId}
              />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
