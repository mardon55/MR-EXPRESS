import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { resolveUrl } from '../utils/resolveUrl';
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
import { useAutoRefresh } from '../hooks/useAutoRefresh';
import PageHeader from '../components/PageHeader';
import ThemePicker from '../components/profile/ThemePicker';
import NightMarket from '../components/profile/NightMarket';
import {
  IconCargoCalc,
  IconChevronRight,
  IconGroupBuy,
  IconPromo,
  IconHelp,
  IconNotifications,
  IconOrders,
  IconPalette,
  IconNightMarket,
} from '../components/icons/ProfileMenuIcons';


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

/** Telegram Web App orqali do'stlarni guruhli xaridga taklif qilish */
function inviteFriendsToGroup(item) {
  const webApp = window.Telegram?.WebApp;
  const botUsername = 'MR_Expressbot';
  const text = `🛍 MR Express guruhli xaridiga qo'shiling!\n\n📦 ${item?.name || 'Mahsulot'}\n💰 Guruh narxi: ${item?.groupPrice ? item.groupPrice.toLocaleString('uz-UZ') + " so'm" : ''}\n👥 ${item?.currentMembers || 0}/${item?.requiredMembers || 0} kishi yig'ildi`;
  const shareLink = `https://t.me/${botUsername}`;
  const url = `https://t.me/share/url?url=${encodeURIComponent(shareLink)}&text=${encodeURIComponent(text)}`;
  if (webApp?.openTelegramLink) {
    webApp.openTelegramLink(url);
  } else {
    window.open(url, '_blank');
  }
}

/** Aktiv guruh kartochkasi — progress, taymer, qo'shilish va taklif tugmalari */
function ActiveGroupCard({ item, onJoin, onLeave, joiningId }) {
  const countdown = useLiveCountdown(item.expiresAt);
  const progressPct = Math.min(
    100,
    Math.round((item.currentMembers / item.requiredMembers) * 100)
  );
  const isUrgent = item.expiresAt - Date.now() < 2 * 60 * 60 * 1000;
  const isFull = item.currentMembers >= item.requiredMembers;
  const isLoading = joiningId === item.id;

  return (
    <article className="rounded-xl border border-theme bg-theme-card p-2.5 shadow-theme-sm">
      <div className="flex gap-2.5">
        {item.image ? (
          <img
            src={resolveUrl(item.image)}
            alt=""
            className="h-[52px] w-[52px] shrink-0 rounded-lg object-cover"
          />
        ) : (
          <div className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-lg bg-theme-icon">
            <Users className="h-6 w-6 text-theme-muted" strokeWidth={1.5} />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h4 className="line-clamp-2 text-[13px] font-semibold leading-snug text-theme">
            {item.name}
          </h4>
          <p className="mt-0.5 text-[15px] font-bold text-theme-accent">
            {item.groupPrice.toLocaleString('uz-UZ')} so&apos;m
          </p>
          <div className="flex items-center gap-1.5">
            <p className="text-[10px] font-medium text-theme-muted">Guruh narxi</p>
            {item.isJoined && (
              <span className="rounded-md bg-emerald-500/12 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700">
                ✓ Qo&apos;shilgansiz
              </span>
            )}
          </div>
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

      <div className="mt-2 flex gap-2">
        {item.isJoined ? (
          <button
            type="button"
            disabled={isLoading}
            onClick={() => onLeave(item.id)}
            className="press-fluid flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-red-300 bg-red-50 py-2 text-[12px] font-semibold text-red-600 transition-opacity disabled:opacity-50"
          >
            {isLoading ? '...' : 'Guruhdan chiqish'}
          </button>
        ) : (
          <button
            type="button"
            disabled={isFull || isLoading}
            onClick={() => onJoin(item.id)}
            className="press-fluid btn-theme-accent flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-[12px] font-semibold shadow-theme-sm disabled:opacity-50"
          >
            {isLoading ? '...' : isFull ? 'Guruh to\'liq' : '+ Guruhga qo\'shilish'}
          </button>
        )}
        <button
          type="button"
          onClick={() => inviteFriendsToGroup(item)}
          className="press-fluid flex items-center justify-center gap-1 rounded-lg border border-theme bg-theme-icon px-3 py-2 text-[12px] font-semibold text-theme-muted"
        >
          <Share2 className="h-3.5 w-3.5" strokeWidth={2.5} />
        </button>
      </div>
    </article>
  );
}

/** Tugallangan guruh kartochkasi — yashil muvaffaqiyat va kargo statusi */
function CompletedGroupCard({ item }) {
  return (
    <article className="rounded-xl border border-emerald-500/25 bg-theme-card p-2.5 shadow-theme-sm">
      <div className="flex gap-2.5">
        <img
          src={resolveUrl(item.image)}
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

/** Promokodlar ichki sahifasi — real API dan ma'lumot oladi */
function PromoCodesView({ onBack, tg, onCountChange }) {
  const [promos, setPromos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState(null);

  const fetchPromos = useCallback(async () => {
    try {
      const data = await api.promoCodes();
      setPromos(data || []);
      onCountChange?.((data || []).filter((p) => p.status === 'active').length);
    } catch {
      /* silent */
    } finally {
      setLoading(false);
    }
  }, [onCountChange]);

  useEffect(() => { fetchPromos(); }, [fetchPromos]);
  useAutoRefresh(fetchPromos, 30_000);

  const activePromos = promos.filter((p) => p.status === 'active');
  const hasPromos = promos.length > 0;

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
        Buyurtmangiz yetkazilgandan so&apos;ng 2 ta maxsus promokod avtomatik beriladi. Muddati 3 kun.
      </p>

      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-theme-accent border-t-transparent" />
        </div>
      )}

      {!loading && !hasPromos && (
        <div className="rounded-xl border border-theme bg-theme-card px-4 py-8 text-center shadow-theme-sm">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-theme-icon">
            <ShoppingBag className="h-6 w-6 text-theme-muted" strokeWidth={2} />
          </span>
          <p className="mt-3 text-[15px] font-semibold text-theme">Hali promokod yo&apos;q</p>
          <p className="mt-2 text-xs leading-relaxed text-theme-muted">
            Birinchi buyurtmangiz yetkazilgach, 2 ta maxsus promokod avtomatik beriladi.
          </p>
        </div>
      )}

      {!loading && hasPromos && (
        <>
          <div className="mb-3 rounded-xl bg-theme-icon px-3 py-2.5">
            <p className="text-[11px] font-medium text-theme-muted">
              Sizda {activePromos.length} ta faol promokod
            </p>
            <p className="mt-0.5 text-xs text-theme">
              Jami {promos.length} ta promokod berilgan
            </p>
          </div>
          <ul className="space-y-2">
            {promos.map((promo) => (
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

/** Guruhli xaridlar ichki sahifasi — real API dan ma'lumot oladi */
function GroupBuyingView({ onBack, onCountChange }) {
  const [tab, setTab] = useState('active');
  const [activeGroups, setActiveGroups] = useState([]);
  const [completedGroups, setCompletedGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [joiningId, setJoiningId] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      const data = await api.groupBuys();
      const actv = data.active || [];
      const comp = data.completed || [];
      setActiveGroups(actv);
      setCompletedGroups(comp);
      onCountChange?.(actv.length);
      setError(null);
    } catch {
      setError('Ma\'lumotlarni yuklashda xato');
    } finally {
      setLoading(false);
    }
  }, [onCountChange]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useAutoRefresh(fetchData, 15_000);

  const handleJoin = async (groupId) => {
    setJoiningId(groupId);
    try {
      await api.joinGroupBuy(groupId);
      await fetchData();
      window.Telegram?.WebApp?.showAlert?.('✅ Guruhga muvaffaqiyatli qo\'shildingiz!');
    } catch (e) {
      window.Telegram?.WebApp?.showAlert?.(e.message || 'Qo\'shilishda xato yuz berdi');
    } finally {
      setJoiningId(null);
    }
  };

  const handleLeave = async (groupId) => {
    setJoiningId(groupId);
    try {
      await api.leaveGroupBuy(groupId);
      await fetchData();
    } catch (e) {
      window.Telegram?.WebApp?.showAlert?.(e.message || 'Chiqishda xato yuz berdi');
    } finally {
      setJoiningId(null);
    }
  };

  return (
    <SubPage title="Guruhli xaridlarim" onBack={onBack}>
      <p className="mb-2.5 text-xs text-theme-muted">Do&apos;stlar bilan birgalikda arzonroq xarid qiling</p>

      <div className="mb-2.5 flex gap-1 rounded-xl border border-theme bg-theme-card p-1 shadow-theme-sm">
        <button
          type="button"
          onClick={() => setTab('active')}
          className={`press-fluid flex-1 rounded-lg py-2 text-[12px] font-semibold transition-colors ${
            tab === 'active' ? 'btn-theme-accent shadow-theme-sm' : 'text-theme-muted'
          }`}
        >
          Aktiv guruhlar
          {activeGroups.length > 0 && (
            <span className="ml-1 rounded-full bg-white/20 px-1.5 text-[10px]">
              {activeGroups.length}
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={() => setTab('completed')}
          className={`press-fluid flex-1 rounded-lg py-2 text-[12px] font-semibold transition-colors ${
            tab === 'completed' ? 'btn-theme-accent shadow-theme-sm' : 'text-theme-muted'
          }`}
        >
          Tugallangan
        </button>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-theme-accent border-t-transparent" />
        </div>
      )}

      {!loading && error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-4 text-center text-xs text-red-600">
          {error}
        </div>
      )}

      {!loading && !error && tab === 'active' && activeGroups.length === 0 && (
        <div className="rounded-xl border border-theme bg-theme-card px-4 py-10 text-center shadow-theme-sm">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-theme-icon">
            <Users className="h-6 w-6 text-theme-muted" strokeWidth={2} />
          </span>
          <p className="mt-3 text-[15px] font-semibold text-theme">Hali guruh yo&apos;q</p>
          <p className="mt-2 text-xs leading-relaxed text-theme-muted">
            Admin yangi guruhli xarid qo&apos;shganda shu yerda ko&apos;rinadi.
          </p>
        </div>
      )}

      {!loading && !error && tab === 'completed' && completedGroups.length === 0 && (
        <div className="rounded-xl border border-theme bg-theme-card px-4 py-10 text-center shadow-theme-sm">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-theme-icon">
            <CheckCircle2 className="h-6 w-6 text-theme-muted" strokeWidth={2} />
          </span>
          <p className="mt-3 text-[15px] font-semibold text-theme">Tugallangan xarid yo&apos;q</p>
          <p className="mt-2 text-xs leading-relaxed text-theme-muted">
            Muvaffaqiyatli yakunlangan guruhli xaridlar shu yerda ko&apos;rinadi.
          </p>
        </div>
      )}

      {!loading && !error && (
        <ul className="space-y-2">
          {tab === 'active' && activeGroups.map((item) => (
            <li key={item.id}>
              <ActiveGroupCard
                item={item}
                onJoin={handleJoin}
                onLeave={handleLeave}
                joiningId={joiningId}
              />
            </li>
          ))}
          {tab === 'completed' && completedGroups.map((item) => (
            <li key={item.id}>
              <CompletedGroupCard item={item} />
            </li>
          ))}
        </ul>
      )}
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

const STATUS_NORMALIZE_MAP = {
  'Aktiv': 'active', 'aktiv': 'active', 'processing': 'active',
  'on_the_way': 'arrived', 'in_uzbekistan': 'arrived', 'delivering': 'arrived',
  'yetkazildi': 'delivered', 'topshirildi': 'delivered',
  'Yetkazildi': 'delivered', 'Yetib keldi': 'arrived',
  'Tasdiqlandi': 'confirmed',
  'Yangi': 'pending', 'new': 'pending',
};

function normalizeOrderStatus(s) {
  if (!s) return 'pending';
  return STATUS_NORMALIZE_MAP[s] || s;
}

const ORDER_STATUS_LABEL = {
  'pending':   'Yangi',
  'confirmed': 'Tasdiqlandi',
  'active':    'Aktiv',
  'arrived':   'Yetib keldi',
  'delivered': 'Yetkazildi',
};

const ORDER_STATUS_COLOR = {
  'pending':   'bg-rose-100 text-rose-700',
  'confirmed': 'bg-blue-100 text-blue-700',
  'active':    'bg-amber-100 text-amber-700',
  'arrived':   'bg-violet-100 text-violet-700',
  'delivered': 'bg-emerald-100 text-emerald-700',
};

function statusLabel(s) { return ORDER_STATUS_LABEL[normalizeOrderStatus(s)] || s || 'Yangi'; }
function statusColor(s) { return ORDER_STATUS_COLOR[normalizeOrderStatus(s)] || 'bg-neutral-100 text-neutral-600'; }

function formatOrderDate(dt) {
  if (!dt) return '';
  try {
    const d = new Date(dt.replace(' ', 'T') + 'Z');
    return d.toLocaleDateString('uz-UZ', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch { return dt; }
}

const ORDER_TABS = [
  { key: 'confirmed', label: 'Tasdiqlandi' },
  { key: 'active',    label: 'Aktiv' },
  { key: 'arrived',   label: 'Yetib keldi' },
  { key: 'delivered', label: 'Yetkazildi' },
];

function OrdersView({ onBack }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('confirmed');
  const [flashIds, setFlashIds] = useState(new Set());

  function flash(ids) {
    setFlashIds(new Set(ids));
    setTimeout(() => setFlashIds(new Set()), 2500);
  }

  useEffect(() => {
    api.getOrders()
      .then((data) => {
        const rows = Array.isArray(data) ? data : [];
        setOrders(rows.map((o) => ({ ...o, status: normalizeOrderStatus(o.status) })));
      })
      .catch(() => setError('Buyurtmalarni yuklashda xato'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const { WebApp } = window.Telegram || {};
    const userId = WebApp?.initDataUnsafe?.user?.id || '123456789';
    const es = new EventSource(`/api/orders/events?tid=${userId}`);

    es.onmessage = (e) => {
      try {
        const event = JSON.parse(e.data);
        if (event.type === 'status_update' && Array.isArray(event.orders)) {
          const changedMap = new Map(
            event.orders.map((o) => [o.id, normalizeOrderStatus(o.status)]),
          );
          setOrders((prev) =>
            prev.map((o) => (changedMap.has(o.id) ? { ...o, status: changedMap.get(o.id) } : o)),
          );
          flash([...changedMap.keys()]);
        }
      } catch {}
    };

    es.onerror = () => es.close();
    return () => es.close();
  }, []);

  const tabOrders = orders.filter((o) => o.status === activeTab);
  const countFor = (key) => orders.filter((o) => o.status === key).length;

  return (
    <SubPage title="Buyurtmalarim" onBack={onBack}>
      {/* Tabs */}
      <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
        {ORDER_TABS.map((tab) => {
          const count = countFor(tab.key);
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex shrink-0 items-center gap-1.5 rounded-full border px-4 py-1.5 text-[13px] font-semibold transition-all duration-200 ${
                isActive
                  ? 'border-theme-accent bg-theme-accent text-white shadow-sm'
                  : 'border-theme bg-theme-card text-theme-muted hover:border-theme-accent/50 hover:text-theme'
              }`}
            >
              {tab.label}
              {count > 0 && (
                <span
                  className={`flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold ${
                    isActive ? 'bg-white/30 text-white' : 'bg-theme-accent/15 text-theme-accent'
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="flex justify-center py-10">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-theme-accent border-t-transparent" />
        </div>
      ) : error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-6 text-center">
          <p className="text-sm font-medium text-red-600">{error}</p>
        </div>
      ) : tabOrders.length === 0 ? (
        <div className="rounded-xl border border-theme bg-theme-card px-4 py-10 text-center shadow-theme-sm">
          <ShoppingBag className="mx-auto h-10 w-10 text-theme-muted" strokeWidth={1.5} />
          <p className="mt-3 text-[15px] font-semibold text-theme">
            {ORDER_TABS.find((t) => t.key === activeTab)?.label} buyurtmalar yo&apos;q
          </p>
          <p className="mt-1.5 text-xs leading-relaxed text-theme-muted">
            Bu bo&apos;limda hozircha buyurtma ko&apos;rinmaydi.
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {tabOrders.map((order) => (
            <li
              key={order.id}
              className={`rounded-xl border p-3.5 shadow-theme-sm transition-colors duration-700 ${
                flashIds.has(order.id)
                  ? 'border-emerald-400 bg-emerald-50'
                  : 'border-theme bg-theme-card'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-[14px] font-bold text-theme">#{order.code}</p>
                  <p className="mt-0.5 text-[11px] text-theme-muted">{formatOrderDate(order.created_at)}</p>
                </div>
                <span className={`shrink-0 rounded-lg px-2.5 py-1 text-[11px] font-semibold ${statusColor(order.status)}`}>
                  {statusLabel(order.status)}
                </span>
              </div>
              <div className="mt-2.5 flex items-center justify-between border-t border-theme pt-2">
                <div className="text-[12px] text-theme-muted">
                  {order.item_count} ta mahsulot
                  {order.address ? <span> · {order.address}</span> : null}
                </div>
                <p className="text-[14px] font-bold text-theme-accent">
                  {order.total.toLocaleString('uz-UZ')} so&apos;m
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </SubPage>
  );
}

function CargoCalcView({ onBack }) {
  const [weight, setWeight] = useState('');
  const [ratePerKg, setRatePerKg] = useState(null);

  useEffect(() => {
    fetch('/api/settings/cargo-rate')
      .then((r) => r.json())
      .then((d) => setRatePerKg(d.rate_per_kg ?? 12000))
      .catch(() => setRatePerKg(12000));
  }, []);

  const total = useMemo(() => {
    if (!ratePerKg) return null;
    const w = parseFloat(weight.replace(',', '.'));
    if (!w || w <= 0) return null;
    return Math.round(w * ratePerKg);
  }, [weight, ratePerKg]);

  return (
    <SubPage title="Kargo hisoblagich" onBack={onBack}>
      {ratePerKg == null ? (
        <div className="flex justify-center py-6">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-theme-accent border-t-transparent" />
        </div>
      ) : (
        <>
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
        </>
      )}
    </SubPage>
  );
}

function formatNotifTime(created_at) {
  if (!created_at) return '';
  try {
    const d = new Date(created_at.replace(' ', 'T') + 'Z');
    const now = new Date();
    const diffMs = now - d;
    const diffMin = Math.floor(diffMs / 60000);
    const diffH = Math.floor(diffMs / 3600000);
    const diffD = Math.floor(diffMs / 86400000);
    if (diffMin < 1) return 'Hozir';
    if (diffMin < 60) return `${diffMin} daqiqa oldin`;
    if (diffH < 24) return `${diffH} soat oldin`;
    if (diffD === 1) return 'Kecha';
    if (diffD < 7) return `${diffD} kun oldin`;
    return d.toLocaleDateString('uz-UZ');
  } catch {
    return created_at;
  }
}

function notifIcon(title = '') {
  if (title.includes('xarid') || title.includes('Buyurtma')) return '🛍️';
  if (title.includes('yetkazil') || title.includes('Yetkazil')) return '🚚';
  if (title.includes('promokod') || title.includes('Promokod')) return '🎟️';
  return '🔔';
}

function NotificationsView({ onBack }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [seenIds, setSeenIds] = useState(() => new Set());

  useEffect(() => {
    api.getNotifications()
      .then((data) => {
        setItems(Array.isArray(data) ? data : []);
      })
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  const handleRead = (id) => setSeenIds((prev) => new Set([...prev, id]));

  return (
    <SubPage title="Bildirishnomalar" onBack={onBack}>
      {loading ? (
        <div className="flex justify-center py-10">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-theme-accent border-t-transparent" />
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-theme bg-theme-card px-4 py-10 text-center shadow-theme-sm">
          <p className="text-3xl">🔔</p>
          <p className="mt-3 text-[15px] font-semibold text-theme">Bildirishnoma yo'q</p>
          <p className="mt-1.5 text-xs text-theme-muted">
            Buyurtma berganingizda yoki promokod qo'shilganda bu yerda xabar ko'rinadi.
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {items.map((n) => {
            const unread = !seenIds.has(n.id);
            return (
              <li
                key={n.id}
                onClick={() => handleRead(n.id)}
                className={`cursor-pointer rounded-xl px-3.5 py-3 transition-colors ${
                  unread ? 'bg-theme-icon' : 'bg-theme-card'
                }`}
              >
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 text-xl leading-none">{notifIcon(n.title)}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-[14px] font-semibold text-theme">{n.title}</p>
                      {unread && (
                        <span
                          className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
                          style={{ backgroundColor: 'var(--theme-accent)' }}
                        />
                      )}
                    </div>
                    {n.message && (
                      <p className="mt-0.5 text-[12px] text-theme-muted">{n.message}</p>
                    )}
                    <p className="mt-1 text-[11px] text-theme-muted">
                      {formatNotifTime(n.created_at)}
                    </p>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
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

function HelpAccordion({ icon, title, children }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="overflow-hidden rounded-xl border border-theme bg-theme-card shadow-theme-sm">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-3.5 text-left"
      >
        <div className="flex items-center gap-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-theme-icon text-theme-accent text-base">
            {icon}
          </span>
          <span className="text-[14px] font-semibold text-theme">{title}</span>
        </div>
        <span
          className={`text-theme-muted transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        >
          ▾
        </span>
      </button>
      {open && (
        <div className="border-t border-theme px-4 py-3.5">
          {children}
        </div>
      )}
    </div>
  );
}

function HelpView({ onBack, tg }) {
  const [support, setSupport] = useState(null);

  useEffect(() => {
    fetch('/api/settings/support')
      .then((r) => r.json())
      .then(setSupport)
      .catch(() => setSupport({ support_username: '', support_group: '' }));
  }, []);

  const username = support?.support_username || '';
  const group = support?.support_group || '';

  return (
    <SubPage title="Yordam markazi" onBack={onBack}>
      <div className="space-y-2">

        {/* 1. Ilova haqida */}
        <HelpAccordion icon="📱" title="Ilova haqida">
          <div className="space-y-2.5 text-[13px] text-theme-muted leading-relaxed">
            <div className="flex items-center justify-between">
              <span className="font-medium text-theme">Ilova nomi</span>
              <span>MR Express</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-medium text-theme">Versiya</span>
              <span>1.0.0</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-medium text-theme">Platforma</span>
              <span>Telegram Mini App</span>
            </div>
            <p className="mt-1 rounded-lg bg-theme-icon px-3 py-2.5 text-xs leading-relaxed">
              MR Express — Xitoydan O&apos;zbekistonga sifatli tovarlarni qulay narxlarda yetkazib beruvchi platforma. Telegram orqali buyurtma bering, holatingizni kuzating.
            </p>
          </div>
        </HelpAccordion>

        {/* 2. Qo'llab-quvvatlash */}
        <HelpAccordion icon="🎧" title="Qo'llab-quvvatlash">
          <div className="space-y-3 text-[13px]">
            <p className="leading-relaxed text-theme-muted">
              Savol yoki muammo bo&apos;lsa — bizga Telegram orqali yozing. Ish vaqti:{' '}
              <span className="font-semibold text-theme">09:00 – 22:00</span> (dush–shan).
            </p>

            {support == null ? (
              <div className="flex justify-center py-2">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-theme-accent border-t-transparent" />
              </div>
            ) : (
              <div className="space-y-2">
                {username ? (
                  <div className="flex items-center justify-between rounded-lg bg-theme-icon px-3 py-2.5">
                    <div>
                      <p className="text-[11px] text-theme-muted">Operator (lichka)</p>
                      <p className="font-semibold text-theme">@{username}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => tg?.openTelegramLink?.(`https://t.me/${username}`)}
                      className="press-fluid rounded-lg bg-theme-accent px-3 py-1.5 text-[11px] font-semibold text-white"
                    >
                      Yozish
                    </button>
                  </div>
                ) : null}

                {group ? (
                  <div className="flex items-center justify-between rounded-lg bg-theme-icon px-3 py-2.5">
                    <div>
                      <p className="text-[11px] text-theme-muted">Guruh / Kanal</p>
                      <p className="font-semibold text-theme">@{group}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => tg?.openTelegramLink?.(`https://t.me/${group}`)}
                      className="press-fluid rounded-lg border border-theme-accent px-3 py-1.5 text-[11px] font-semibold text-theme-accent"
                    >
                      Ochish
                    </button>
                  </div>
                ) : null}

                {!username && !group && (
                  <p className="text-center text-xs text-theme-muted py-1">
                    Admin hali aloqa ma&apos;lumotlarini kiritmagan
                  </p>
                )}
              </div>
            )}
          </div>
        </HelpAccordion>

        {/* 3. Dasturchi haqida */}
        <HelpAccordion icon="💻" title="Dasturchi haqida">
          <div className="space-y-2.5 text-[13px] text-theme-muted leading-relaxed">
            <div className="flex items-center justify-between">
              <span className="font-medium text-theme">Texnologiya</span>
              <span>React · FastAPI · Aiogram</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-medium text-theme">Ma&apos;lumotlar bazasi</span>
              <span>SQLite</span>
            </div>
            <p className="mt-1 rounded-lg bg-theme-icon px-3 py-2.5 text-xs leading-relaxed">
              Bu ilova zamonaviy texnologiyalar yordamida ishlab chiqilgan. Taklif va xatoliklar uchun qo&apos;llab-quvvatlash bo&apos;limiga murojaat qiling.
            </p>
          </div>
        </HelpAccordion>

      </div>
    </SubPage>
  );
}

export default function Profile() {
  const { user: sessionUser } = useApp();
  const { theme, saveTheme, hasUnsavedChanges } = useTheme();
  const { user: tgUser, tg } = useTelegram();
  const location = useLocation();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [section, setSection] = useState(null);
  const [savingTheme, setSavingTheme] = useState(false);
  const [groupBuyCount, setGroupBuyCount] = useState(0);
  const [promoCount, setPromoCount] = useState(0);

  // Ichki bo'lim ochiq bo'lganda Telegram back button uni yopsin (navigate(-1) emas)
  useEffect(() => {
    if (section) {
      window.__tgBackHandler = () => setSection(null);
      return () => { window.__tgBackHandler = null; };
    }
  }, [section]);

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
    return <OrdersView onBack={() => setSection(null)} />;
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
    return (
      <GroupBuyingView
        onBack={() => setSection(null)}
        onCountChange={setGroupBuyCount}
      />
    );
  }
  if (section === 'promo') {
    return (
      <PromoCodesView
        onBack={() => setSection(null)}
        tg={tg}
        onCountChange={setPromoCount}
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
            badge={groupBuyCount || undefined}
            onClick={() => setSection('group-buy')}
          />
          <MenuRow
            icon={IconPromo}
            label="Promokodlar"
            badge={promoCount || undefined}
            onClick={() => setSection('promo')}
          />
        </nav>

      </div>
    </>
  );
}
