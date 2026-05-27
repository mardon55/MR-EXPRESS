import { useCallback, useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { ShoppingBagIcon, ArrowPathIcon } from '@heroicons/react/24/outline'
import { PageHeader } from '@/components/ui/PageHeader'
import { GlassPanel } from '@/components/ui/GlassPanel'
import { GlassButton } from '@/components/ui/GlassButton'
import { OrderStatusSelect } from '@/components/orders/OrderStatusSelect'
import { api, type OrderRow } from '@/lib/api'
import { formatCurrency } from '@/lib/utils'
import {
  orderStatusLabel,
  orderStatusColor,
  TAB_STATUSES,
  type OrderStatusValue,
  type TabKey,
} from '@/constants/orderStatus'
import { staggerContainer, fadeUpItem } from '@/lib/motion'
import { cn } from '@/lib/utils'

export function OrdersPage() {
  const [orders, setOrders] = useState<OrderRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<TabKey>('all')
  const [liveIds, setLiveIds] = useState<Set<number>>(new Set())
  const esRef = useRef<EventSource | null>(null)

  const loadOrders = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data } = await api.getOrders({ limit: 100 })
      setOrders(data.items)
    } catch {
      setError("Buyurtmalarni yuklab bo'lmadi.")
      setOrders([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadOrders()
  }, [loadOrders])

  useEffect(() => {
    const es = new EventSource('/api/v1/orders/events')
    esRef.current = es

    es.onmessage = (e) => {
      try {
        const event = JSON.parse(e.data)
        if (event.type === 'status_update') {
          const { order_id, status } = event as { order_id: number; status: OrderStatusValue }
          setOrders((prev) =>
            prev.map((o) => (o.id === order_id ? { ...o, status } : o)),
          )
          setLiveIds((prev) => {
            const next = new Set(prev)
            next.add(order_id)
            setTimeout(() => setLiveIds((s) => { const n = new Set(s); n.delete(order_id); return n }), 2500)
            return next
          })
        }
      } catch {}
    }

    es.onerror = () => {
      es.close()
    }

    return () => {
      es.close()
    }
  }, [])

  async function handleStatusChange(orderId: number, status: OrderStatusValue) {
    const prev = orders
    setOrders((list) =>
      list.map((o) => (o.id === orderId ? { ...o, status } : o)),
    )
    try {
      await api.patchOrderStatus(orderId, status)
    } catch {
      setOrders(prev)
      setError('Status yangilanmadi')
    }
  }

  const filteredOrders =
    activeTab === 'all' ? orders : orders.filter((o) => o.status === activeTab)

  const countFor = (key: TabKey) =>
    key === 'all' ? orders.length : orders.filter((o) => o.status === key).length

  return (
    <motion.div variants={staggerContainer} initial="initial" animate="animate">
      <PageHeader
        title="Buyurtmalar"
        description="Statusni o'zgartirish uchun pastdagi ro'yxatdan foydalaning."
        action={
          <GlassButton type="button" onClick={loadOrders} disabled={loading}>
            <ArrowPathIcon className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
            Yangilash
          </GlassButton>
        }
      />

      <motion.div variants={fadeUpItem} className="mb-4">
        <div className="flex gap-1 overflow-x-auto rounded-2xl bg-white/5 p-1 backdrop-blur-sm border border-white/10">
          {TAB_STATUSES.map((tab) => {
            const count = countFor(tab.key)
            const isActive = activeTab === tab.key
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  'flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all duration-200',
                  isActive
                    ? 'bg-white/15 text-ink-900 shadow-sm dark:bg-white/20 dark:text-white'
                    : 'text-ink-500 hover:bg-white/10 hover:text-ink-700 dark:text-ink-400 dark:hover:text-ink-200',
                )}
              >
                {tab.label}
                <span
                  className={cn(
                    'flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold tabular-nums',
                    isActive
                      ? 'bg-brand-500/20 text-brand-700 dark:bg-brand-400/20 dark:text-brand-300'
                      : 'bg-white/10 text-ink-400',
                  )}
                >
                  {count}
                </span>
              </button>
            )
          })}
        </div>
      </motion.div>

      <motion.div variants={fadeUpItem}>
        <GlassPanel className="overflow-hidden !p-0">
          {error && (
            <div className="border-b border-white/10 bg-rose-500/10 px-6 py-3 text-sm text-rose-600 dark:text-rose-400">
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex min-h-[280px] items-center justify-center text-ink-500">
              Yuklanmoqda…
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="flex min-h-[280px] flex-col items-center justify-center gap-3 text-center">
              <ShoppingBagIcon className="h-12 w-12 text-ink-400" />
              <p className="text-ink-500">
                {activeTab === 'all' ? "Hozircha buyurtmalar yo'q" : `${TAB_STATUSES.find(t => t.key === activeTab)?.label} buyurtmalar yo'q`}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px] text-left text-sm">
                <thead>
                  <tr className="border-b border-white/20 bg-white/5 text-ink-500 dark:border-white/10 dark:text-ink-400">
                    <th className="px-6 py-4 font-semibold">ID</th>
                    <th className="px-4 py-4 font-semibold">Mijoz</th>
                    <th className="px-4 py-4 font-semibold">Telefon</th>
                    <th className="px-4 py-4 font-semibold">Manzil</th>
                    <th className="px-4 py-4 font-semibold">Summa</th>
                    <th className="px-4 py-4 font-semibold">Sana</th>
                    <th className="px-6 py-4 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.map((row) => (
                    <tr
                      key={row.id}
                      className={cn(
                        'border-b border-white/10 last:border-0 dark:border-white/5 transition-colors duration-500',
                        liveIds.has(row.id) && 'bg-emerald-500/10',
                      )}
                    >
                      <td className="px-6 py-4 font-mono text-xs font-medium text-brand-600 dark:text-accent-cyan">
                        #{row.code}
                      </td>
                      <td className="px-4 py-4 font-medium text-ink-800 dark:text-ink-100">
                        {row.customer_name}
                      </td>
                      <td className="px-4 py-4 text-ink-600 dark:text-ink-300">
                        {row.phone ?? '—'}
                      </td>
                      <td className="px-4 py-4 text-ink-600 dark:text-ink-300 max-w-[180px]">
                        <span className="line-clamp-2 text-xs leading-relaxed">
                          {row.address ?? '—'}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-ink-700 dark:text-ink-200">
                        {formatCurrency(row.total)}
                      </td>
                      <td className="px-4 py-4 text-xs text-ink-500">
                        {row.created_at
                          ? new Date(row.created_at).toLocaleString('uz-UZ')
                          : '—'}
                      </td>
                      <td className="px-6 py-4">
                        <OrderStatusSelect
                          value={row.status}
                          onChange={(status) => handleStatusChange(row.id, status)}
                        />
                        <p className={cn(
                          'mt-1 text-[10px] font-semibold px-2 py-0.5 rounded-full w-fit',
                          orderStatusColor(row.status),
                        )}>
                          {orderStatusLabel(row.status)}
                        </p>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </GlassPanel>
      </motion.div>
    </motion.div>
  )
}
