import { useCallback, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { ShoppingBagIcon, ArrowPathIcon } from '@heroicons/react/24/outline'
import { PageHeader } from '@/components/ui/PageHeader'
import { GlassPanel } from '@/components/ui/GlassPanel'
import { GlassButton } from '@/components/ui/GlassButton'
import { OrderStatusSelect } from '@/components/orders/OrderStatusSelect'
import { api, type OrderRow } from '@/lib/api'
import { formatCurrency } from '@/lib/utils'
import { orderStatusLabel, type OrderStatusValue } from '@/constants/orderStatus'
import { staggerContainer, fadeUpItem } from '@/lib/motion'

export function OrdersPage() {
  const [orders, setOrders] = useState<OrderRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadOrders = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data } = await api.getOrders({ limit: 100 })
      setOrders(data.items)
    } catch {
      setError('Buyurtmalarni yuklab bo\'lmadi. Backend (port 8000) ishga tushirilganini tekshiring.')
      setOrders([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadOrders()
  }, [loadOrders])

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

  return (
    <motion.div variants={staggerContainer} initial="initial" animate="animate">
      <PageHeader
        title="Buyurtmalar"
        description="Barcha buyurtmalar — statusni o'zgartirish uchun pastdagi ro'yxatdan foydalaning."
        action={
          <GlassButton type="button" onClick={loadOrders} disabled={loading}>
            <ArrowPathIcon className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
            Yangilash
          </GlassButton>
        }
      />

      <motion.div variants={fadeUpItem}>
        <GlassPanel className="overflow-hidden !p-0">
          {error && (
            <div className="border-b border-white/10 bg-accent-rose/10 px-6 py-3 text-sm text-rose-600 dark:text-accent-rose">
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex min-h-[280px] items-center justify-center text-ink-500">
              Yuklanmoqda…
            </div>
          ) : orders.length === 0 ? (
            <div className="flex min-h-[280px] flex-col items-center justify-center gap-3 text-center">
              <ShoppingBagIcon className="h-12 w-12 text-ink-400" />
              <p className="text-ink-500">Hozircha buyurtmalar yo&apos;q</p>
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
                  {orders.map((row) => (
                    <tr
                      key={row.id}
                      className="border-b border-white/10 last:border-0 dark:border-white/5"
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
                        <p className="mt-1 text-[10px] text-ink-400">
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
