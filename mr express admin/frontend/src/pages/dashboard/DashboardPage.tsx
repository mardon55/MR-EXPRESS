import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { BanknotesIcon, CalendarIcon } from '@heroicons/react/24/solid'
import { PageHeader } from '@/components/ui/PageHeader'
import { StatCard } from '@/components/ui/StatCard'
import { GlassPanel } from '@/components/ui/GlassPanel'
import { formatCurrency } from '@/lib/utils'
import { staggerContainer } from '@/lib/motion'
import { api, type DashboardStats } from '@/lib/api'
import { orderStatusLabel } from '@/constants/orderStatus'

const EMPTY_STATS: DashboardStats = {
  sold_products: 0,
  daily_revenue: 0,
  weekly_revenue: 0,
  monthly_revenue: 0,
}

export function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>(EMPTY_STATS)
  const [recent, setRecent] = useState<
    { id: string; customer: string; amount: number; status: string }[]
  >([])
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const loadStats = async (silent = false) => {
    if (!silent) setLoading(true)
    try {
      const [statsRes, recentRes] = await Promise.all([
        api.getDashboardStats(),
        api.getRecentOrders(),
      ])
      setStats(statsRes.data)
      setRecent(recentRes.data.items)
      setLastUpdated(new Date())
    } catch {
      if (!silent) {
        setStats(EMPTY_STATS)
        setRecent([])
      }
    } finally {
      if (!silent) setLoading(false)
    }
  }

  useEffect(() => {
    loadStats()
    intervalRef.current = setInterval(() => loadStats(true), 8000)
    const es = new EventSource('/api/v1/orders/events')
    es.onmessage = () => loadStats(true)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
      es.close()
    }
  }, [])

  const timeStr = lastUpdated
    ? lastUpdated.toLocaleTimeString('uz-UZ', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })
    : null

  return (
    <motion.div variants={staggerContainer} initial="initial" animate="animate">
      <PageHeader
        title="Boshqaruv paneli"
        description="Aylanma mablag' va buyurtmalar hisoboti."
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

      {/* Faqat 2 ta karta: Kunlik va Haftalik aylanma */}
      <div className="mb-8 grid gap-5 sm:grid-cols-2">
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

      {/* Buyurtmalar jadvali — to'liq kenglikda */}
      <GlassPanel>
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-ink-900 dark:text-white">
            Buyurtmalar
          </h2>
          <span className="frosted-pill px-3 py-1 text-xs font-semibold text-brand-600 dark:text-accent-cyan">
            LIVE
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-white/20 text-ink-500 dark:border-white/10 dark:text-ink-400">
                <th className="pb-4 pr-6 font-semibold">ID</th>
                <th className="pb-4 pr-6 font-semibold">Mijoz</th>
                <th className="pb-4 pr-6 font-semibold">Summa</th>
                <th className="pb-4 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {recent.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-10 text-center text-ink-500">
                    Buyurtmalar yo&apos;q
                  </td>
                </tr>
              ) : (
                recent.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-white/10 last:border-0 dark:border-white/5"
                  >
                    <td className="py-4 pr-6 font-mono text-xs font-medium text-brand-600 dark:text-accent-cyan">
                      #{row.id}
                    </td>
                    <td className="py-4 pr-6 font-medium text-ink-800 dark:text-ink-100">
                      {row.customer}
                    </td>
                    <td className="py-4 pr-6 text-ink-600 dark:text-ink-300">
                      {formatCurrency(row.amount)}
                    </td>
                    <td className="py-4 text-xs font-semibold text-ink-600 dark:text-ink-300">
                      {orderStatusLabel(row.status)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </GlassPanel>
    </motion.div>
  )
}
