import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  UsersIcon,
  ShoppingBagIcon,
  BanknotesIcon,
  BoltIcon,
  CubeIcon,
  ChatBubbleLeftRightIcon,
} from '@heroicons/react/24/solid'
import { PageHeader } from '@/components/ui/PageHeader'
import { StatCard } from '@/components/ui/StatCard'
import { GlassPanel } from '@/components/ui/GlassPanel'
import { GlassButton } from '@/components/ui/GlassButton'
import { formatCurrency, formatNumber } from '@/lib/utils'
import { staggerContainer } from '@/lib/motion'
import { api, type DashboardStats, type RecentOrderItem } from '@/lib/api'
import { orderStatusLabel } from '@/constants/orderStatus'

const EMPTY_STATS: DashboardStats = {
  users: 0,
  telegram_users: 0,
  sold_products: 0,
  orders: 0,
  revenue: 0,
  active_orders: 0,
}

export function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>(EMPTY_STATS)
  const [recent, setRecent] = useState<RecentOrderItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      try {
        const [statsRes, recentRes] = await Promise.all([
          api.getDashboardStats(),
          api.getRecentOrders(),
        ])
        if (!cancelled) {
          setStats(statsRes.data ?? EMPTY_STATS)
          const items = recentRes.data?.items
          setRecent(Array.isArray(items) ? items : [])
        }
      } catch {
        if (!cancelled) {
          setStats(EMPTY_STATS)
          setRecent([])
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <motion.div variants={staggerContainer} initial="initial" animate="animate">
      <PageHeader
        title="Boshqaruv paneli"
        description="MR Express platformasining umumiy ko'rinishi — real API statistikasi."
        action={<GlassButton variant="primary">Hisobot yuklab olish</GlassButton>}
      />

      {loading && (
        <p className="mb-4 text-sm text-ink-500">Statistika yuklanmoqda…</p>
      )}

      <div className="mb-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        <StatCard
          label="Telegram foydalanuvchilari"
          value={formatNumber(stats.telegram_users)}
          delta={stats.users_change}
          icon={ChatBubbleLeftRightIcon}
          gradient="from-accent-cyan/80 to-brand-600/80"
        />
        <StatCard
          label="Sotilgan mahsulotlar soni"
          value={formatNumber(stats.sold_products)}
          icon={CubeIcon}
          gradient="from-accent-violet/80 to-brand-600/80"
        />
        <StatCard
          label="Foydalanuvchilar"
          value={formatNumber(stats.users)}
          delta={stats.users_change}
          icon={UsersIcon}
          gradient="from-accent-cyan/80 to-brand-600/80"
        />
        <StatCard
          label="Umumiy buyurtmalar"
          value={formatNumber(stats.orders)}
          delta={stats.orders_change}
          icon={ShoppingBagIcon}
          gradient="from-brand-500/90 to-brand-700/80"
        />
        <StatCard
          label="Daromad"
          value={formatCurrency(stats.revenue)}
          delta={stats.revenue_change}
          icon={BanknotesIcon}
          gradient="from-accent-emerald/80 to-brand-600/70"
        />
        <StatCard
          label="Faol buyurtmalar"
          value={formatNumber(stats.active_orders)}
          delta={stats.active_orders_change}
          icon={BoltIcon}
          gradient="from-accent-violet/80 to-brand-600/80"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <GlassPanel className="lg:col-span-3">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-ink-900 dark:text-white">
              So&apos;nggi buyurtmalar
            </h2>
            <span className="frosted-pill px-3 py-1 text-xs font-semibold text-brand-600 dark:text-accent-cyan">
              API
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-white/20 text-ink-500 dark:border-white/10 dark:text-ink-400">
                  <th className="pb-4 pr-4 font-semibold">ID</th>
                  <th className="pb-4 pr-4 font-semibold">Mijoz</th>
                  <th className="pb-4 pr-4 font-semibold">Summa</th>
                  <th className="pb-4 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {recent.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-ink-500">
                      Buyurtmalar yo&apos;q
                    </td>
                  </tr>
                ) : (
                  recent.map((row) => (
                    <tr
                      key={row.id}
                      className="border-b border-white/10 last:border-0 dark:border-white/5"
                    >
                      <td className="py-4 pr-4 font-mono text-xs font-medium text-brand-600 dark:text-accent-cyan">
                        #{row.id}
                      </td>
                      <td className="py-4 pr-4 font-medium text-ink-800 dark:text-ink-100">
                        {row.customer}
                      </td>
                      <td className="py-4 pr-4 text-ink-600 dark:text-ink-300">
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

        <GlassPanel className="lg:col-span-2">
          <h2 className="mb-5 text-lg font-semibold text-ink-900 dark:text-white">
            Tezkor harakatlar
          </h2>
          <div className="flex flex-col gap-2.5">
            {['Yangi buyurtma', 'Mahsulot qo\'shish', 'Banner yuklash', 'Promokod yaratish'].map(
              (label) => (
                <GlassButton key={label} className="w-full justify-start !rounded-3xl">
                  <span className="h-2 w-2 rounded-full bg-gradient-to-r from-brand-400 to-accent-cyan" />
                  {label}
                </GlassButton>
              ),
            )}
          </div>
          <div className="mt-6 rounded-3xl border border-dashed border-white/25 bg-white/5 p-4 dark:border-white/10">
            <p className="text-xs font-medium text-ink-500">API integratsiya</p>
            <p className="mt-2 text-sm text-ink-600 dark:text-ink-300">
              Statistika{' '}
              <code className="rounded-xl bg-white/10 px-2 py-0.5 text-xs">
                GET /api/v1/dashboard/stats
              </code>{' '}
              orqali real vaqtda yangilanadi.
            </p>
          </div>
        </GlassPanel>
      </div>
    </motion.div>
  )
}
