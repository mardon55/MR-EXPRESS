import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { BanknotesIcon, CalendarIcon } from '@heroicons/react/24/solid'
import {
  ComposedChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { PageHeader } from '@/components/ui/PageHeader'
import { StatCard } from '@/components/ui/StatCard'
import { GlassPanel } from '@/components/ui/GlassPanel'
import { formatCurrency } from '@/lib/utils'
import { staggerContainer } from '@/lib/motion'
import { api, type DashboardStats } from '@/lib/api'

const EMPTY_STATS: DashboardStats = {
  sold_products: 0,
  daily_revenue: 0,
  weekly_revenue: 0,
  monthly_revenue: 0,
}

type OHLCPoint = {
  day: string
  open: number
  close: number
  high: number
  low: number
  orders: number
  total_revenue: number
}

type Range = 7 | 14 | 30

function shortMoney(v: number) {
  if (v >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(1)}B`
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)}K`
  return String(Math.round(v))
}

function formatDayLabel(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString('uz-UZ', { month: 'short', day: 'numeric' })
}

// ─── Yapon shami custom shape ────────────────────────────────────────────────
// recharts Bar dataKey="high" => y=pixel(high), y+height=pixel(0)
// Shunga ko'ra barcha OHLC ni to'g'ri koordinataga o'tkazamiz
function CandleShape(props: any) {
  const { x, y, width, height, payload } = props
  if (!payload || !height || height <= 0) return null

  const { open, close, high, low } = payload as OHLCPoint

  // Piksel/qiymat nisbati: 0 (chart asosi) -> y+height, high -> y
  const base = y + height          // piksel: 0 qiymati
  const ppu  = height / (high || 1) // piksel per unit

  const pxOf = (v: number) => base - v * ppu

  const yHigh  = pxOf(high)
  const yLow   = pxOf(low)
  const yOpen  = pxOf(open)
  const yClose = pxOf(close)

  const isBull = close >= open
  const color  = isBull ? '#10b981' : '#ef4444'
  const cx     = x + width / 2
  const bw     = Math.max(width * 0.60, 5)

  const bodyTop    = Math.min(yOpen, yClose)
  const bodyBottom = Math.max(yOpen, yClose)
  const bodyH      = Math.max(bodyBottom - bodyTop, 2)

  return (
    <g>
      {/* Yuqori wick */}
      <line x1={cx} y1={yHigh} x2={cx} y2={bodyTop}
        stroke={color} strokeWidth={1.5} strokeLinecap="round" />
      {/* Pastki wick */}
      <line x1={cx} y1={bodyBottom} x2={cx} y2={yLow}
        stroke={color} strokeWidth={1.5} strokeLinecap="round" />
      {/* Shama tanasi */}
      <rect
        x={cx - bw / 2} y={bodyTop}
        width={bw} height={bodyH}
        fill={color} fillOpacity={isBull ? 0.88 : 0.80}
        stroke={color} strokeWidth={1} rx={2}
      />
      {/* Markaziy chiziq (doji belgisi uchun) */}
      {bodyH <= 2 && (
        <line x1={cx - bw / 2} y1={bodyTop} x2={cx + bw / 2} y2={bodyTop}
          stroke={color} strokeWidth={2} />
      )}
    </g>
  )
}

// ─── Tooltip ─────────────────────────────────────────────────────────────────
function CandleTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null
  const d = payload[0]?.payload as OHLCPoint
  if (!d) return null
  const isBull = d.close >= d.open
  const change = d.open > 0 ? ((d.close - d.open) / d.open * 100).toFixed(1) : null

  return (
    <div className="min-w-[200px] rounded-2xl border border-white/30 bg-white/95 px-4 py-3 shadow-2xl backdrop-blur-xl dark:bg-neutral-900/95 dark:border-white/10">
      <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-neutral-400">
        {formatDayLabel(d.day)}
      </p>
      <div className="flex flex-col gap-1.5 text-[12px]">
        <Row label="Ochilish (1-buyurtma)"  val={shortMoney(d.open)} />
        <Row
          label="Yopilish (oxirgi)"
          val={shortMoney(d.close)}
          cls={isBull ? 'text-emerald-600 font-bold' : 'text-red-500 font-bold'}
        />
        {change && (
          <p className={`text-[11px] font-semibold ${isBull ? 'text-emerald-500' : 'text-red-400'}`}>
            {isBull ? '▲' : '▼'} {Math.abs(Number(change))}% o'zgarish
          </p>
        )}
        <hr className="border-neutral-100 dark:border-neutral-700" />
        <Row label="Maksimum buyurtma"  val={shortMoney(d.high)} cls="text-emerald-600" />
        <Row label="Minimum buyurtma"   val={shortMoney(d.low)}  cls="text-red-400" />
        <hr className="border-neutral-100 dark:border-neutral-700" />
        <Row label="Jami daromad"       val={shortMoney(d.total_revenue)} cls="text-brand-600 font-bold" />
        <Row label="Buyurtmalar soni"   val={`${d.orders} ta`} />
      </div>
    </div>
  )
}

function Row({ label, val, cls = '' }: { label: string; val: string; cls?: string }) {
  return (
    <div className="flex justify-between gap-6">
      <span className="text-neutral-500">{label}</span>
      <span className={`tabular-nums ${cls || 'font-semibold'}`}>{val}</span>
    </div>
  )
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────
export function DashboardPage() {
  const [stats, setStats]             = useState<DashboardStats>(EMPTY_STATS)
  const [chart, setChart]             = useState<OHLCPoint[]>([])
  const [range, setRange]             = useState<Range>(14)
  const [loading, setLoading]         = useState(true)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [live, setLive]               = useState(false)
  const intervalRef                   = useRef<ReturnType<typeof setInterval> | null>(null)

  const loadData = async (days: number, silent = false) => {
    if (!silent) setLoading(true)
    try {
      const [statsRes, chartRes] = await Promise.all([
        api.getDashboardStats(),
        api.getRevenueChart(days),
      ])
      setStats(statsRes.data)
      setChart(chartRes.data)
      setLastUpdated(new Date())
    } catch { /* ignore */ }
    finally { if (!silent) setLoading(false) }
  }

  useEffect(() => {
    loadData(range)
    intervalRef.current = setInterval(() => loadData(range, true), 5000)
    const es = new EventSource('/api/v1/orders/events')
    es.onopen    = () => setLive(true)
    es.onerror   = () => setLive(false)
    es.onmessage = (e) => {
      try { if (JSON.parse(e.data).type !== 'heartbeat') loadData(range, true) }
      catch { loadData(range, true) }
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
      es.close(); setLive(false)
    }
  }, [range])

  const timeStr = lastUpdated?.toLocaleTimeString('uz-UZ', {
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  })

  const totalRev    = chart.reduce((s, p) => s + p.total_revenue, 0)
  const totalOrders = chart.reduce((s, p) => s + p.orders, 0)

  return (
    <motion.div variants={staggerContainer} initial="initial" animate="animate">
      <PageHeader
        title="Boshqaruv paneli"
        description="Aylanma mablag' tahlili — Yapon shami grafigi."
        action={
          <div className="flex items-center gap-2 text-sm">
            <span className={`h-2 w-2 rounded-full transition-colors ${live ? 'bg-emerald-500 animate-pulse' : 'bg-neutral-400'}`} />
            <span className="text-ink-400 dark:text-ink-500">
              {live ? 'LIVE' : 'Ulanmoqda'}{timeStr ? ` · ${timeStr}` : ''}
            </span>
          </div>
        }
      />

      {loading && <p className="mb-4 text-sm text-ink-500">Yuklanmoqda…</p>}

      {/* Kunlik va Haftalik aylanma kartalari */}
      <div className="mb-6 grid gap-5 sm:grid-cols-2">
        <StatCard
          label="Kunlik aylanma"
          value={formatCurrency(stats.daily_revenue)}
          icon={BanknotesIcon}
          gradient="from-accent-emerald/80 to-brand-600/70"
        />
        <StatCard
          label="Haftalik aylanma"
          value={formatCurrency(stats.weekly_revenue)}
          icon={CalendarIcon}
          gradient="from-brand-500/90 to-brand-700/80"
        />
      </div>

      {/* Yapon shami grafigi */}
      <GlassPanel>
        <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-semibold text-ink-900 dark:text-white">
              Daromad grafigi
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-normal text-amber-700 dark:bg-amber-900/40 dark:text-amber-400">
                🕯 Yapon shami
              </span>
            </h2>
            <p className="mt-0.5 text-xs text-ink-400">
              Har bir shama = bir kunlik buyurtmalar (Ochilish · Yopilish · Maksimum · Minimum)
            </p>
          </div>
          <div className="flex items-center gap-1 rounded-2xl border border-white/30 bg-white/40 p-1 dark:border-white/10 dark:bg-white/5">
            {([7, 14, 30] as Range[]).map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`rounded-xl px-4 py-1.5 text-xs font-semibold transition-all ${
                  range === r
                    ? 'bg-brand-500 text-white shadow'
                    : 'text-ink-500 hover:text-ink-800 dark:text-ink-400 dark:hover:text-white'
                }`}
              >
                {r === 7 ? '7 kun' : r === 14 ? '2 hafta' : '30 kun'}
              </button>
            ))}
          </div>
        </div>

        {chart.length === 0 ? (
          <div className="flex h-72 flex-col items-center justify-center gap-3 text-ink-400">
            <span className="text-5xl">🕯</span>
            <span className="text-sm">Bu davrda buyurtmalar yo&apos;q</span>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={320}>
            <ComposedChart
              data={chart}
              margin={{ top: 16, right: 20, left: 0, bottom: 0 }}
              barCategoryGap="40%"
            >
              <CartesianGrid
                strokeDasharray="3 6"
                stroke="rgba(148,163,184,0.12)"
                vertical={false}
              />
              <XAxis
                dataKey="day"
                tickFormatter={formatDayLabel}
                tick={{ fontSize: 11, fill: '#94a3b8' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                domain={[0, (max: number) => Math.ceil(max * 1.12)]}
                tickFormatter={shortMoney}
                tick={{ fontSize: 11, fill: '#94a3b8' }}
                axisLine={false}
                tickLine={false}
                width={60}
              />
              <Tooltip
                content={<CandleTooltip />}
                cursor={{ fill: 'rgba(148,163,184,0.06)' }}
              />
              {/* dataKey="high" - bu recharts ga y,height ni to'g'ri hisoblash uchun kerak */}
              <Bar
                dataKey="high"
                shape={<CandleShape />}
                isAnimationActive={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        )}

        {/* Pastki legend */}
        <div className="mt-4 flex flex-wrap items-center gap-5 border-t border-white/20 pt-4 dark:border-white/10">
          <div className="flex items-center gap-2">
            <span className="h-4 w-3 rounded-sm bg-emerald-500 opacity-85" />
            <span className="text-xs text-ink-500">O'sish — yopilish &gt; ochilish</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-4 w-3 rounded-sm bg-red-500 opacity-80" />
            <span className="text-xs text-ink-500">Tushish — yopilish &lt; ochilish</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-block w-px h-4 border-l border-neutral-400" />
            <span className="text-xs text-ink-500">Wick = narx oraliq</span>
          </div>
          {chart.length > 0 && (
            <span className="ml-auto text-xs text-ink-400">
              Jami:{' '}
              <span className="font-bold text-ink-700 dark:text-ink-200">
                {formatCurrency(totalRev)}
              </span>
              {' · '}{totalOrders} ta buyurtma
            </span>
          )}
        </div>
      </GlassPanel>
    </motion.div>
  )
}
