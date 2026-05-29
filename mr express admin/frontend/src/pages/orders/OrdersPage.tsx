import { useCallback, useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ShoppingBagIcon, ArrowPathIcon, ChevronDownIcon } from '@heroicons/react/24/outline'
import { PageHeader } from '@/components/ui/PageHeader'
import { GlassPanel } from '@/components/ui/GlassPanel'
import { GlassButton } from '@/components/ui/GlassButton'
import { OrderStatusSelect } from '@/components/orders/OrderStatusSelect'
import { api, type OrderRow, type OrderItem, type SelectedVariant } from '@/lib/api'
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

function OrderItemsRow({ items }: { items: OrderItem[] }) {
  if (!items || items.length === 0) {
    return (
      <div className="px-6 py-3 text-xs text-ink-400 italic">
        Mahsulotlar ma'lumoti topilmadi
      </div>
    )
  }

  return (
    <div className="border-t border-white/10 bg-white/[0.03] px-6 py-4">
      <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-ink-400">
        Buyurtma tarkibi
      </p>
      <div className="space-y-2">
        {items.map((item, idx) => {
          const hasDiscount = item.old_price !== null && item.old_price > item.unit_price
          const discountPct = hasDiscount
            ? Math.round((1 - item.unit_price / item.old_price!) * 100)
            : null

          return (
            <div
              key={idx}
              className="flex items-center gap-3 rounded-xl bg-white/5 px-3 py-2.5"
            >
              {item.image_url ? (
                <img
                  src={item.image_url}
                  alt={item.product_name}
                  className="h-10 w-10 shrink-0 rounded-lg object-cover"
                />
              ) : (
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/10 text-lg">
                  📦
                </div>
              )}

              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-semibold text-ink-800 dark:text-ink-100">
                  {item.product_name}
                </p>
                {item.selected_variants && item.selected_variants.length > 0 && (
                  <p className="mt-0.5 text-[11px] text-ink-400">
                    {item.selected_variants.map((v: SelectedVariant) => `${v.name}: ${v.value}`).join(' | ')}
                  </p>
                )}
                <div className="mt-0.5 flex items-center gap-2">
                  <span className="text-[12px] font-bold text-brand-600 dark:text-accent-cyan">
                    {formatCurrency(item.unit_price)}
                  </span>
                  {hasDiscount && (
                    <>
                      <span className="text-[11px] text-ink-400 line-through">
                        {formatCurrency(item.old_price!)}
                      </span>
                      <span className="rounded-full bg-rose-500/15 px-1.5 py-0.5 text-[10px] font-bold text-rose-500">
                        -{discountPct}%
                      </span>
                    </>
                  )}
                </div>
              </div>

              <div className="shrink-0 text-right">
                <p className="text-[12px] text-ink-500">×{item.quantity}</p>
                <p className="text-[13px] font-bold text-ink-800 dark:text-ink-100">
                  {formatCurrency(item.subtotal)}
                </p>
              </div>
            </div>
          )
        })}
      </div>

      <div className="mt-3 flex justify-end border-t border-white/10 pt-3">
        <div className="flex items-center gap-2">
          <span className="text-[12px] text-ink-400">Jami:</span>
          <span className="text-[15px] font-bold text-ink-800 dark:text-white">
            {formatCurrency(items.reduce((s, i) => s + i.subtotal, 0))}
          </span>
        </div>
      </div>
    </div>
  )
}

function OrderTableRow({
  row,
  isLive,
  onStatusChange,
}: {
  row: OrderRow
  isLive: boolean
  onStatusChange: (id: number, status: OrderStatusValue) => void
}) {
  const [expanded, setExpanded] = useState(false)

  return (
    <>
      <tr
        className={cn(
          'border-b border-white/10 last:border-0 dark:border-white/5 transition-colors duration-500 cursor-pointer hover:bg-white/5',
          isLive && 'bg-emerald-500/10',
          expanded && 'bg-white/[0.04]',
        )}
        onClick={() => setExpanded((v) => !v)}
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
        <td className="px-4 py-4">
          <div className="flex flex-col gap-0.5">
            <span className="text-[14px] font-bold text-ink-700 dark:text-ink-200">
              {formatCurrency(row.total)}
            </span>
            {row.items && row.items.length > 0 && (
              <span className="text-[11px] text-ink-400">
                {row.items.length} ta mahsulot
              </span>
            )}
          </div>
        </td>
        <td className="px-4 py-4 text-xs text-ink-500">
          {row.created_at
            ? new Date(row.created_at).toLocaleString('uz-UZ')
            : '—'}
        </td>
        <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
          <OrderStatusSelect
            value={row.status}
            onChange={(status) => onStatusChange(row.id, status)}
          />
          <p className={cn(
            'mt-1 text-[10px] font-semibold px-2 py-0.5 rounded-full w-fit',
            orderStatusColor(row.status),
          )}>
            {orderStatusLabel(row.status)}
          </p>
        </td>
        <td className="pr-4 py-4">
          <div
            className={cn(
              'flex h-7 w-7 items-center justify-center rounded-full transition-colors',
              expanded ? 'bg-brand-500/20 text-brand-600' : 'bg-white/10 text-ink-400 hover:bg-white/20',
            )}
          >
            <ChevronDownIcon
              className={cn('h-4 w-4 transition-transform duration-200', expanded && 'rotate-180')}
            />
          </div>
        </td>
      </tr>
      {expanded && (
        <tr className="border-b border-white/10 dark:border-white/5">
          <td colSpan={8} className="p-0">
            <AnimatePresence>
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
              >
                <OrderItemsRow items={row.items} />
              </motion.div>
            </AnimatePresence>
          </td>
        </tr>
      )}
    </>
  )
}

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
        } else if (event.type === 'new_order') {
          loadOrders()
          setActiveTab('pending')
        }
      } catch {}
    }

    es.onerror = () => {
      setTimeout(() => {
        const newEs = new EventSource('/api/v1/orders/events')
        esRef.current = newEs
      }, 3000)
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
        description="Statusni o'zgartirish yoki tarkibini ko'rish uchun qatorni bosing."
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
              <table className="w-full min-w-[920px] text-left text-sm">
                <thead>
                  <tr className="border-b border-white/20 bg-white/5 text-ink-500 dark:border-white/10 dark:text-ink-400">
                    <th className="px-6 py-4 font-semibold">ID</th>
                    <th className="px-4 py-4 font-semibold">Mijoz</th>
                    <th className="px-4 py-4 font-semibold">Telefon</th>
                    <th className="px-4 py-4 font-semibold">Manzil</th>
                    <th className="px-4 py-4 font-semibold">Summa</th>
                    <th className="px-4 py-4 font-semibold">Sana</th>
                    <th className="px-6 py-4 font-semibold">Status</th>
                    <th className="pr-4 py-4 font-semibold">
                      <span className="sr-only">Kengaytirish</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.map((row) => (
                    <OrderTableRow
                      key={row.id}
                      row={row}
                      isLive={liveIds.has(row.id)}
                      onStatusChange={handleStatusChange}
                    />
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
