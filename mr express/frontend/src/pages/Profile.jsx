import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Copy,
  Share2,
  ShoppingBag,
  Ticket,
  Timer,
  Users,
} from 'lucide-react';
import { api } from '../api';
import { useApp } from '../context/AppContext';
import { useTheme } from '../context/ThemeContext';
import { useTelegram } from '../hooks/useTelegram';
import PageHeader from '../components/PageHeader';
import ProfileEditSheet from '../components/profile/ProfileEditSheet';
import ThemePicker from '../components/profile/ThemePicker';
import NightMarket from '../components/profile/NightMarket';
import {
  IconCargoCalc,
  IconChevronRight,
  IconEdit,
  IconGroupBuy,
  IconPromo,
  IconHelp,
  IconNotifications,
  IconOrders,
  IconPalette,
  IconNightMarket,
} from '../components/icons/ProfileMenuIcons';

/** Guruhli xarid — aktiv guruhlar uchun mock ma'lumotlar (API ulanishi keyinroq) */
const ACTIVE_GROUP_BUYS = [
  {
    id: 'gb-1',
    name: 'Smartfon qopqoq — silikon',
    image:
      'https://images.unsplash.com/photo-1601784551446-20c9e07cdbdb?w=120&h=120&fit=crop',
    groupPrice: 89_000,
    currentMembers: 2,
    requiredMembers: 3,
    /** 24 soatlik muddat tugash vaqti (ms) — demo uchun hozirdan +18 soat */
    expiresAt: Date.now() + 18 * 60 * 60 * 1000,
  },
  {
    id: 'gb-2',
    name: 'Bluetooth quloqchin TWS',
    image:
      'https://images.unsplash.com/photo-1590658268037-6bf12f032a33?w=120&h=120&fit=crop',
    groupPrice: 249_000,
    currentMembers: 1,
    requiredMembers: 3,
    expiresAt: Date.now() + 6 * 60 * 60 * 1000 + 42 * 60 * 1000,
  },
];

/** Guruhli xarid — muvaffaqiyatli tugallangan guruhlar mock ro'yxati */
const COMPLETED_GROUP_BUYS = [
  {
    id: 'gb-done-1',
    name: 'Elektr choynak 1.8L',
    image:
      'https://images.unsplash.com/photo-1563291077-7c27b05d3b0e?w=120&h=120&fit=crop',
    groupPrice: 156_000,
    currentMembers: 3,
    requiredMembers: 3,
    completedAt: '12 may 2026',
  },
  {
    id: 'gb-done-2',
    name: 'Sport sumka — yengil',
    image:
      'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=120&h=120&fit=crop',
    groupPrice: 72_000,
    currentMembers: 3,
    requiredMembers: 3,
    completedAt: '8 may 2026',
  },
];

/** Qolgan millisekundlarni hh:mm:ss formatiga aylantiradi */
function formatCountdown(ms) {
  if (ms <= 0) return '00:00:00';
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

/** Jonli teskari vaqt hisoblagichi — useState + useEffect orqali har soniya yangilanadi */
function useLiveCountdown(expiresAt) {
  const [label, setLabel] = useState(() => formatCountdown(expiresAt - Date.now()));

  useEffect(() => {
    const tick = () => {
      setLabel(formatCountdown(expiresAt - Date.now()));
    };
    tick();
    const timerId = window.setInterval(tick, 1000);
    return () => window.clearInterval(timerId);
  }, [expiresAt]);

  return label;
}

/** Telegram Web App orqali do'stlarni taklif qilish (rasmiy ulashish oynasi) */
function inviteFriendsToGroup() {
  const shareUrl = 'https://t.me';
  const webApp = window.Telegram?.WebApp;
  if (webApp?.shareToBot) {
    webApp.shareToBot(shareUrl);
    return;
  }
  if (window.Telegram?.WebApp?.shareToBot) {
    window.Telegram.WebApp.shareToBot(shareUrl);
  }
}

/** Aktiv guruh kartochkasi — progress, taymer, taklif tugmasi */
function ActiveGroupCard({ item }) {
  const countdown = useLiveCountdown(item.expiresAt);
  const progressPct = Math.min(
    100,
    Math.round((item.currentMembers / item.requiredMembers) * 100)
  );
  const isUrgent = item.expiresAt - Date.now() < 2 * 60 * 60 * 1000;

  return (
    <article className="rounded-xl border border-theme bg-theme-card p-2.5 shadow-theme-sm">
      <div className="flex gap-2.5">
        <img
          src={item.image}
          alt=""
          className="h-[52px] w-[52px] shrink-0 rounded-lg object-cover"
        />
        <div className="min-w-0 flex-1">
          <h4 className="line-clamp-2 text-[13px] font-semibold leading-snug text-theme">
            {item.name}
          </h4>
          <p className="mt-0.5 text-[15px] font-bold text-theme-accent">
            {item.groupPrice.toLocaleString('uz-UZ')} so&apos;m
          </p>
          <p className="text-[10px] font-medium text-theme-muted">Guruh narxi</p>
        </div>
      </div>

      <div className="mt-2.5">
        <div className="mb-1 flex items-center justify-between gap-2">
          <span className="flex items-center gap-1 text-[11px] font-medium text-theme-muted">
            <Users className="h-3.5 w-3.5 text-theme-accent" strokeWidth={2.25} />
            {item.currentMembers}/{item.requiredMembers} kishi
          </span>
          <span className="text-[11px] font-semibold text-theme-accent">{progressPct}%</span>
        </div>
        <div
          className="h-1.5 overflow-hidden rounded-full bg-theme-icon"
          role="progressbar"
          aria-valuenow={progressPct}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className="h-full rounded-full transition-[width] duration-500 ease-out"
            style={{
              width: `${progressPct}%`,
              background: 'var(--theme-accent-gradient)',
            }}
          />
        </div>
      </div>

      <div
        className={`mt-2 flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 ${
          isUrgent ? 'bg-red-500/10' : 'bg-theme-icon'
        }`}
      >
        <span className="flex items-center gap-1 text-[11px] font-medium text-theme-muted">
          {isUrgent ? (
            <AlertCircle className="h-3.5 w-3.5 shrink-0 text-red-500" strokeWidth={2.25} />
          ) : (
            <Timer className="h-3.5 w-3.5 shrink-0 text-theme-accent" strokeWidth={2.25} />
          )}
          Muddat tugashiga
        </span>
        <span
          className={`font-mono text-[13px] font-bold tabular-nums ${
            isUrgent ? 'text-red-600' : 'text-theme-accent'
          }`}
        >
          {countdown}
        </span>
      </div>

      <button
        type="button"
        onClick={inviteFriendsToGroup}
        className="press-fluid btn-theme-accent mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg py-2 text-[12px] font-semibold shadow-theme-sm"
      >
        <Share2 className="h-3.5 w-3.5" strokeWidth={2.5} />
        Do&apos;stlarni taklif qilish
      </button>
    </article>
  );
}

/** Tugallangan guruh kartochkasi — yashil muvaffaqiyat va kargo statusi */
function CompletedGroupCard({ item }) {
  return (
    <article className="rounded-xl border border-emerald-500/25 bg-theme-card p-2.5 shadow-theme-sm">
      <div className="flex gap-2.5">
        <img
          src={item.image}
          alt=""
          className="h-[52px] w-[52px] shrink-0 rounded-lg object-cover ring-1 ring-emerald-500/20"
        />
        <div className="min-w-0 flex-1">
          <h4 className="line-clamp-2 text-[13px] font-semibold leading-snug text-theme">
            {item.name}
          </h4>
          <p className="mt-0.5 text-[14px] font-bold text-emerald-600">
            {item.groupPrice.toLocaleString('uz-UZ')} so&apos;m
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-1">
            <span className="inline-flex items-center gap-0.5 rounded-md bg-emerald-500/12 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700">
              <CheckCircle2 className="h-3 w-3" strokeWidth={2.5} />
              Muvaffaqiyatli yakunlandi
            </span>
            <span className="rounded-md bg-theme-icon px-1.5 py-0.5 text-[10px] font-medium text-theme-muted">
              Kargoga berildi
            </span>
          </div>
          <p className="mt-1 flex items-center gap-1 text-[10px] text-theme-muted">
            <Users className="h-3 w-3 text-emerald-600" strokeWidth={2.25} />
            {item.currentMembers}/{item.requiredMembers} kishi yig&apos;ildi · {item.completedAt}
          </p>
        </div>
      </div>
    </article>
  );
}

/** Xariddan keyin beriladigan promokodlar — faqat buyurtma bo'lganda ko'rinadi */
const PROMOS_AFTER_PURCHASE = [
  {
    id: 'promo-1',
    code: 'MRXITOY10',
    title: 'Keyingi buyurtmaga 10% chegirma',
    discountLabel: '10%',
    minOrder: 200_000,
    validUntil: '2026-08-23',
    orderRef: 'Buyurtma #1042',
    status: 'active',
  },
  {
    id: 'promo-2',
    code: 'MRKARGO5',
    title: 'Kargo uchun 5% chegirma',
    discountLabel: '5%',
    minOrder: 150_000,
    validUntil: '2026-07-15',
    orderRef: 'Buyurtma #1042',
    status: 'active',
  },
  {
    id: 'promo-3',
    code: 'MRLOYAL15',
    title: 'VIP mijoz — 15% chegirma',
    discountLabel: '15%',
    minOrder: 500_000,
    validUntil: '2026-06-01',
    orderRef: 'Buyurtma #0987',
    status: 'used',
  },
];

/** Bitta promokod kartochkasi */
function PromoCodeCard({ promo, copiedId, onCopy }) {
  const isUsed = promo.status === 'used';
  const isActive = promo.status === 'active';

  return (
    <li
      className={`rounded-xl border p-3 shadow-theme-sm ${
        isUsed
          ? 'border-theme bg-theme-card opacity-75'
          : 'border-theme bg-theme-card'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-theme-icon">
            <Ticket className="h-4 w-4 text-theme-accent" strokeWidth={2.25} />
          </span>
          <div>
            <p className="text-[13px] font-semibold text-theme">{promo.title}</p>
            <p className="mt-0.5 text-[10px] text-theme-muted">{promo.orderRef}</p>
          </div>
        </div>
        <span
          className={`shrink-0 rounded-md px-2 py-0.5 text-[10px] font-bold ${
            isActive
              ? 'bg-emerald-500/12 text-emerald-700'
              : 'bg-theme-icon text-theme-muted'
          }`}
        >
          {isActive ? 'Faol' : 'Ishlatilgan'}
        </span>
      </div>

      <div className="mt-2.5 flex items-center justify-between gap-2 rounded-lg border border-dashed border-theme bg-theme-bg px-2.5 py-2">
        <span className="font-mono text-[15px] font-bold tracking-wide text-theme-accent">
          {promo.code}
        </span>
        {isActive && (
          <button
            type="button"
            onClick={() => onCopy(promo)}
            className="press-fluid flex items-center gap-1 rounded-lg bg-theme-icon px-2 py-1 text-[11px] font-semibold text-theme-accent"
          >
            {copiedId === promo.id ? (
              <>
                <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
                Nusxa
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" strokeWidth={2.5} />
                Nusxalash
              </>
            )}
          </button>
        )}
      </div>

      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-theme-muted">
        <span>Chegirma: {promo.discountLabel}</span>
        <span>Min: {promo.minOrder.toLocaleString('uz-UZ')} so&apos;m</span>
        <span>Muddat: {promo.validUntil}</span>
      </div>
    </li>
  );
}

/** Promokodlar ichki sahifasi — xarid qilmagan foydalanuvchiga bo'sh holat */
function PromoCodesView({ onBack, ordersCount, tg }) {
  const [copiedId, setCopiedId] = useState(null);
  const hasPurchased = (ordersCount ?? 0) > 0;
  const activePromos = PROMOS_AFTER_PURCHASE.filter((p) => p.status === 'active');
  const promosToShow = hasPurchased ? PROMOS_AFTER_PURCHASE : [];

  const handleCopy = async (promo) => {
    try {
      await navigator.clipboard.writeText(promo.code);
      setCopiedId(promo.id);
      tg?.showAlert?.(`Promokod nusxalandi: ${promo.code}`);
      window.setTimeout(() => setCopiedId(null), 2000);
    } catch {
      tg?.showAlert?.('Nusxalash amalga oshmadi');
    }
  };

  return (
    <SubPage title="Promokodlar" onBack={onBack}>
      <p className="mb-3 text-xs leading-relaxed text-theme-muted">
        Promokodlar faqat muvaffaqiyatli xarid qilgandan so&apos;ng avtomatik beriladi.
      </p>

      {!hasPurchased ? (
        <div className="rounded-xl border border-theme bg-theme-card px-4 py-8 text-center shadow-theme-sm">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-theme-icon">
            <ShoppingBag className="h-6 w-6 text-theme-muted" strokeWidth={2} />
          </span>
          <p className="mt-3 text-[15px] font-semibold text-theme">Hali promokod yo&apos;q</p>
          <p className="mt-2 text-xs leading-relaxed text-theme-muted">
            Birinchi buyurtmangizni yakunlang — keyingi xaridlaringiz uchun maxsus
            promokodlar shu yerda paydo bo&apos;ladi.
          </p>
        </div>
      ) : (
        <>
          <div className="mb-3 rounded-xl bg-theme-icon px-3 py-2.5">
            <p className="text-[11px] font-medium text-theme-muted">
              Sizda {activePromos.length} ta faol promokod
            </p>
            <p className="mt-0.5 text-xs text-theme">
              {ordersCount} ta buyurtma asosida berilgan
            </p>
          </div>
          <ul className="space-y-2">
            {promosToShow.map((promo) => (
              <PromoCodeCard
                key={promo.id}
                promo={promo}
                copiedId={copiedId}
                onCopy={handleCopy}
              />
            ))}
          </ul>
        </>
      )}
    </SubPage>
  );
}

/** Guruhli xaridlar ichki sahifasi — tablar va mahsulot kartochkalari shu yerda */
function GroupBuyingView({ onBack }) {
  const [tab, setTab] = useState('active');

  return (
    <SubPage title="Guruhli xaridlarim" onBack={onBack}>
      <p className="mb-2.5 text-xs text-theme-muted">Do&apos;stlar bilan arzonroq xarid</p>

      <div className="mb-2.5 flex gap-1 rounded-xl border border-theme bg-theme-card p-1 shadow-theme-sm">
        <button
          type="button"
          onClick={() => setTab('active')}
          className={`press-fluid flex-1 rounded-lg py-2 text-[12px] font-semibold transition-colors ${
            tab === 'active'
              ? 'btn-theme-accent shadow-theme-sm'
              : 'text-theme-muted'
          }`}
        >
          Aktiv guruhlar
        </button>
        <button
          type="button"
          onClick={() => setTab('completed')}
          className={`press-fluid flex-1 rounded-lg py-2 text-[12px] font-semibold transition-colors ${
            tab === 'completed'
              ? 'btn-theme-accent shadow-theme-sm'
              : 'text-theme-muted'
          }`}
        >
          Tugallangan xaridlar
        </button>
      </div>

      <ul className="space-y-2">
        {tab === 'active' &&
          ACTIVE_GROUP_BUYS.map((item) => (
            <li key={item.id}>
              <ActiveGroupCard item={item} />
            </li>
          ))}
        {tab === 'completed' &&
          COMPLETED_GROUP_BUYS.map((item) => (
            <li key={item.id}>
              <CompletedGroupCard item={item} />
            </li>
          ))}
      </ul>
    </SubPage>
  );
}

function ProfileAvatar({ photoUrl, initials, accent }) {
  if (photoUrl) {
    return (
      <img
        src={photoUrl}
        alt=""
        className="h-14 w-14 shrink-0 rounded-full object-cover ring-2 ring-theme-card shadow-sm"
      />
    );
  }
  return (
    <div
      className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-lg font-semibold text-white shadow-sm"
      style={{ background: accent }}
    >
      {initials}
    </div>
  );
}

function MenuRow({ icon: Icon, label, badge, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="press-fluid flex w-full items-center gap-3 border-b border-theme px-3.5 py-3 text-left last:border-0"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-theme-icon">
        <Icon />
      </span>
      <span className="min-w-0 flex-1 text-[15px] font-medium text-theme">{label}</span>
      {badge != null && badge > 0 && (
        <span className="rounded-full bg-theme-icon px-2 py-0.5 text-xs font-semibold text-theme-accent">
          {badge}
        </span>
      )}
      <IconChevronRight />
    </button>
  );
}

function SubPage({ title, onBack, children }) {
  return (
    <div className="flex h-full flex-col bg-theme-bg">
      <PageHeader title={title} onBack={onBack} />
      <div className="scroll-area min-h-0 flex-1 px-4 py-3">{children}</div>
    </div>
  );
}

function OrdersView({ count, onBack }) {
  return (
    <SubPage title="Buyurtmalarim" onBack={onBack}>
      <div className="rounded-xl bg-theme-card px-4 py-8 text-center shadow-theme-sm">
        <p className="text-3xl font-bold text-theme-accent">{count}</p>
        <p className="mt-1 text-sm text-theme-muted">Jami buyurtmalar</p>
        <p className="mt-4 text-xs leading-relaxed text-theme-muted">
          Buyurtmalar tarixi tez orada shu yerda ko&apos;rinadi
        </p>
      </div>
    </SubPage>
  );
}

function CargoCalcView({ onBack }) {
  const [weight, setWeight] = useState('');
  const ratePerKg = 12000;
  const total = useMemo(() => {
    const w = parseFloat(weight.replace(',', '.'));
    if (!w || w <= 0) return null;
    return Math.round(w * ratePerKg);
  }, [weight]);

  return (
    <SubPage title="Kargo hisoblagich" onBack={onBack}>
      <p className="mb-3 text-xs text-theme-muted">
        Og&apos;irlik (kg) × {ratePerKg.toLocaleString('uz-UZ')} so&apos;m/kg
      </p>
      <input
        type="number"
        inputMode="decimal"
        min="0"
        step="0.1"
        value={weight}
        onChange={(e) => setWeight(e.target.value)}
        placeholder="Masalan: 2.5"
        className="mb-3 w-full rounded-xl border border-theme bg-theme-card px-3.5 py-2.5 text-[15px] text-theme outline-none focus:ring-2 focus:ring-[var(--theme-accent)]"
      />
      {total != null && (
        <div className="rounded-xl bg-theme-icon px-4 py-4 text-center">
          <p className="text-xs font-medium text-theme-muted">Taxminiy narx</p>
          <p className="mt-1 text-2xl font-bold text-theme-accent">
            {total.toLocaleString('uz-UZ')} so&apos;m
          </p>
        </div>
      )}
    </SubPage>
  );
}

function NotificationsView({ onBack }) {
  const items = [
    { title: 'Buyurtma qabul qilindi', time: 'Bugun', unread: true },
    { title: 'Yangi chegirmalar', time: 'Kecha', unread: false },
  ];

  return (
    <SubPage title="Bildirishnomalar" onBack={onBack}>
      <ul className="space-y-2">
        {items.map((n) => (
          <li
            key={n.title}
            className={`rounded-xl px-3.5 py-3 ${n.unread ? 'bg-theme-icon' : 'bg-theme-card'}`}
          >
            <div className="flex items-start justify-between gap-2">
              <p className="text-[14px] font-medium text-theme">{n.title}</p>
              {n.unread && (
                <span
                  className="mt-1 h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: 'var(--theme-accent)' }}
                />
              )}
            </div>
            <p className="mt-0.5 text-xs text-theme-muted">{n.time}</p>
          </li>
        ))}
      </ul>
    </SubPage>
  );
}

function InterfaceThemeView({ onBack, onSave, saving, hasUnsavedChanges }) {
  return (
    <SubPage title="Interfeys rangi" onBack={onBack}>
      <div className="rounded-xl border border-theme bg-theme-card p-3 shadow-theme-sm">
        <ThemePicker />
      </div>
      <button
        type="button"
        disabled={saving}
        onClick={onSave}
        className="press-fluid btn-theme-accent mt-3 w-full rounded-xl py-3 text-[15px] font-semibold shadow-theme-sm disabled:opacity-60"
      >
        {saving
          ? 'Saqlanmoqda...'
          : hasUnsavedChanges
            ? 'Mavzuni saqlash'
            : 'Mavzu saqlangan'}
      </button>
    </SubPage>
  );
}

function HelpView({ onBack, tg }) {
  const items = [
    { q: 'Buyurtma qanday beriladi?', a: "Mahsulotni savatga qo'shing va buyurtma bering." },
    { q: 'Yetkazib berish qancha vaqt?', a: "Toshkent bo'yicha 1–3 ish kuni." },
    { q: "Qo'llab-quvvatlash", a: '@MR_EXPRESSBOT orqali yozing.' },
  ];

  return (
    <SubPage title="Yordam markazi" onBack={onBack}>
      <ul className="space-y-2">
        {items.map((item) => (
          <li key={item.q} className="rounded-xl bg-theme-card px-3.5 py-3 shadow-theme-sm">
            <p className="text-[14px] font-semibold text-theme">{item.q}</p>
            <p className="mt-1 text-xs leading-relaxed text-theme-muted">{item.a}</p>
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={() => tg?.openTelegramLink?.('https://t.me/MR_EXPRESSBOT')}
        className="press-fluid mt-4 w-full rounded-xl border border-theme py-2.5 text-sm font-semibold text-theme-accent"
      >
        Chat orqali yozish
      </button>
    </SubPage>
  );
}

export default function Profile() {
  const { user: sessionUser, updateUser } = useApp();
  const { theme, saveTheme, hasUnsavedChanges } = useTheme();
  const { user: tgUser, tg } = useTelegram();
  const location = useLocation();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [editOpen, setEditOpen] = useState(false);
  const [section, setSection] = useState(null);
  const [savingTheme, setSavingTheme] = useState(false);

  useEffect(() => {
    api.profile().then(setProfile).catch(console.error);
  }, []);

  /** Savatdan buyurtma tasdiqlangach — avtomatik "Buyurtmalarim" bo'limiga ochish */
  useEffect(() => {
    if (location.state?.openSection === 'orders') {
      setSection('orders');
      navigate('/profile', { replace: true, state: {} });
    }
  }, [location.state, navigate]);

  const displayProfile = profile || sessionUser;
  const firstName = displayProfile?.first_name || '';
  const lastName = displayProfile?.last_name || '';
  const fullName = [firstName, lastName].filter(Boolean).join(' ') || 'Foydalanuvchi';
  const telegramId = displayProfile?.telegram_id || tgUser?.id;
  const phone = displayProfile?.phone || '—';
  const initials = useMemo(() => {
    const a = firstName?.[0] || '';
    const b = lastName?.[0] || '';
    return (a + b).toUpperCase() || '?';
  }, [firstName, lastName]);

  const photoUrl = tgUser?.photo_url;
  const accentBg = theme.accentGradient || theme.accent;

  const handleSaveTheme = async () => {
    setSavingTheme(true);
    saveTheme();
    tg?.showAlert?.('Mavzu saqlandi!');
    setSavingTheme(false);
  };

  if (section === 'orders') {
    return <OrdersView count={profile?.orders_count ?? 0} onBack={() => setSection(null)} />;
  }
  if (section === 'cargo') {
    return <CargoCalcView onBack={() => setSection(null)} />;
  }
  if (section === 'notifications') {
    return <NotificationsView onBack={() => setSection(null)} />;
  }
  if (section === 'help') {
    return <HelpView onBack={() => setSection(null)} tg={tg} />;
  }
  if (section === 'theme') {
    return (
      <InterfaceThemeView
        onBack={() => setSection(null)}
        onSave={handleSaveTheme}
        saving={savingTheme}
        hasUnsavedChanges={hasUnsavedChanges}
      />
    );
  }
  if (section === 'group-buy') {
    return <GroupBuyingView onBack={() => setSection(null)} />;
  }
  if (section === 'promo') {
    return (
      <PromoCodesView
        onBack={() => setSection(null)}
        ordersCount={profile?.orders_count ?? 0}
        tg={tg}
      />
    );
  }
  if (section === 'night-market') {
    return <NightMarket onBack={() => setSection(null)} />;
  }

  return (
    <>
      <div className="scroll-area h-full bg-theme-bg px-3.5 pt-1 pb-nav-safe">
        <header className="flex shrink-0 items-center gap-3 rounded-2xl border border-theme bg-theme-card px-3 py-3 shadow-theme-sm">
          <ProfileAvatar photoUrl={photoUrl} initials={initials} accent={accentBg} />
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-[17px] font-semibold leading-tight text-theme">
              {fullName}
            </h1>
            <p className="mt-0.5 text-[11px] font-medium uppercase tracking-wide text-theme-muted">
              ID {telegramId}
            </p>
            <p className="mt-0.5 truncate text-[13px] text-theme-muted">{phone}</p>
          </div>
        </header>

        <nav
          className="mt-2.5 shrink-0 overflow-hidden rounded-2xl border border-theme bg-theme-card shadow-theme-sm"
          aria-label="Profil menyu"
        >
          <MenuRow
            icon={IconOrders}
            label="Buyurtmalarim"
            badge={profile?.orders_count}
            onClick={() => setSection('orders')}
          />
          <MenuRow icon={IconCargoCalc} label="Kargo hisoblagich" onClick={() => setSection('cargo')} />
          <MenuRow
            icon={IconNotifications}
            label="Bildirishnomalar"
            badge={1}
            onClick={() => setSection('notifications')}
          />
          <MenuRow icon={IconHelp} label="Yordam markazi" onClick={() => setSection('help')} />
          <MenuRow icon={IconPalette} label="Interfeys rangi" onClick={() => setSection('theme')} />
          <MenuRow
            icon={IconNightMarket}
            label="Tungi bozor"
            onClick={() => setSection('night-market')}
          />
          <MenuRow
            icon={IconGroupBuy}
            label="Guruhli xaridlarim"
            badge={ACTIVE_GROUP_BUYS.length}
            onClick={() => setSection('group-buy')}
          />
          <MenuRow
            icon={IconPromo}
            label="Promokodlar"
            badge={
              (profile?.orders_count ?? 0) > 0
                ? PROMOS_AFTER_PURCHASE.filter((p) => p.status === 'active').length
                : undefined
            }
            onClick={() => setSection('promo')}
          />
        </nav>

        <div className="flex-1" />

        <button
          type="button"
          onClick={() => setEditOpen(true)}
          className="press-fluid mt-2 flex w-full shrink-0 items-center justify-center gap-2 rounded-xl border border-theme bg-theme-card py-2.5 text-[14px] font-semibold text-theme shadow-theme-sm"
        >
          <IconEdit />
          Profilni tahrirlash
        </button>
      </div>

      <ProfileEditSheet
        open={editOpen}
        onClose={() => setEditOpen(false)}
        profile={displayProfile}
        onSaved={(p) => {
          setProfile(p);
          updateUser({
            first_name: p.first_name,
            last_name: p.last_name,
            phone: p.phone,
          });
        }}
      />
    </>
  );
}
