import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { BanknotesIcon, CalendarIcon } from '@heroicons/react/24/solid'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
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

type ChartPoint = { day: string; revenue: number; orders: number }
type Range = 7 | 14 | 30

function formatDay(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString('uz-UZ', { month: 'short', day: 'numeric' })
}

function shortMoney(v: number) {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)}K`
  return String(v)
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  const d = payload[0]?.payload as ChartPoint
  return (
    <div className="rounded-2xl border border-white/20 bg-white/90 px-4 py-3 shadow-xl backdrop-blur-md dark:bg-neutral-900/90 dark:border-white/10">
      <p className="mb-1 text-xs font-semibold text-neutral-500 dark:text-neutral-400">
        {formatDay(label)}
      </p>
      <p className="text-[15px] font-bold text-brand-600 dark:text-accent-cyan">
        {formatCurrency(d.revenue)}
      </p>
      <p className="mt-0.5 text-xs text-neutral-500">
        {d.orders} ta buyurtma
      </p>
    </div>
  )
}

export function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>(EMPTY_STATS)
  const [chart, setChart] = useState<ChartPoint[]>([])
  const [range, setRange] = useState<Range>(14)
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

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
    } catch {
      /* ignore */
    } finally {
      if (!silent) setLoading(false)
    }
  }

  useEffect(() => {
    loadData(range)
    intervalRef.current = setInterval(() => loadData(range, true), 8000)
    const es = new EventSource('/api/v1/orders/events')
    es.onmessage = () => loadData(range, true)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
      es.close()
    }
  }, [range])

  const timeStr = lastUpdated
    ? lastUpdated.toLocaleTimeString('uz-UZ', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })
    : null

  // Grafik uchun gradient id
  const gradId = 'revenueGrad'

  // Eng yuqori nuqta (referens chiziq uchun)
  const maxPoint = chart.reduce(
    (acc, p) => (p.revenue > acc.revenue ? p : acc),
    { day: '', revenue: 0, orders: 0 },
  )

  return (
    <motion.div variants={staggerContainer} initial="initial" animate="animate">
      <PageHeader
        title="Boshqaruv paneli"
        description="Aylanma mablag' tahlili va hisoboti."
        action={
          timeStr ? (
            <span className="text-sm text-ink-400 dark:text-ink-500">
              🟢 {timeStr}
            </span>
          ) : undefined
        }
      />

      {loading && (
        <p className="mb-4 text-sm text-ink-500">Yuklanmoqda…</p>
      )}

      {/* 2 ta stat karta */}
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

      {/* Birja grafigi */}
      <GlassPanel>
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-ink-900 dark:text-white">
              Daromad grafigi
            </h2>
            <p className="mt-0.5 text-xs text-ink-400">
              Kunlik daromad dinamikasi (UZS)
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
          <div className="flex h-64 items-center justify-center text-ink-400 text-sm">
            Bu davrda ma&apos;lumot yo&apos;q
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={chart} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.01} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 6"
                stroke="rgba(148,163,184,0.15)"
                vertical={false}
              />
              <XAxis
                dataKey="day"
                tickFormatter={formatDay}
                tick={{ fontSize: 11, fill: '#94a3b8' }}
                axisLine={false}
                tickLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                tickFormatter={(v) => shortMoney(v)}
                tick={{ fontSize: 11, fill: '#94a3b8' }}
                axisLine={false}
                tickLine={false}
                width={55}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#3b82f6', strokeWidth: 1, strokeDasharray: '4 4' }} />
              {maxPoint.revenue > 0 && (
                <ReferenceLine
                  y={maxPoint.revenue}
                  stroke="#10b981"
                  strokeDasharray="4 4"
                  strokeWidth={1.5}
                  label={{
                    value: `MAX: ${shortMoney(maxPoint.revenue)}`,
                    position: 'insideTopRight',
                    fontSize: 10,
                    fill: '#10b981',
                    fontWeight: 600,
                  }}
                />
              )}
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="#3b82f6"
                strokeWidth={2.5}
                fill={`url(#${gradId})`}
                dot={false}
                activeDot={{ r: 5, fill: '#3b82f6', stroke: '#fff', strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}

        {/* Pastki legend */}
        <div className="mt-4 flex flex-wrap items-center gap-6 border-t border-white/20 pt-4 dark:border-white/10">
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-brand-500" />
            <span className="text-xs text-ink-500">Daromad (UZS)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-px w-6 border-t-2 border-dashed border-emerald-500" />
            <span className="text-xs text-ink-500">Maksimum nuqta</span>
          </div>
          {chart.length > 0 && (
            <span className="ml-auto text-xs text-ink-400">
              Jami:{' '}
              <span className="font-semibold text-ink-700 dark:text-ink-200">
                {formatCurrency(chart.reduce((s, p) => s + p.revenue, 0))}
              </span>
              {' '}— {chart.reduce((s, p) => s + p.orders, 0)} buyurtma
            </span>
          )}
        </div>
      </GlassPanel>
    </motion.div>
  )
}
