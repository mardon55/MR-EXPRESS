import { useCallback, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { UserGroupIcon, PlusIcon, ArrowPathIcon, TrashIcon } from '@heroicons/react/24/outline'
import { PageHeader } from '@/components/ui/PageHeader'
import { GlassPanel } from '@/components/ui/GlassPanel'
import { GlassButton } from '@/components/ui/GlassButton'
import { GlassModal } from '@/components/ui/GlassModal'
import { PanelState } from '@/components/ui/PanelState'
import { inputClass, selectClass } from '@/lib/formStyles'
import { api, mediaUrl, type GroupBuyRow, type ProductRow } from '@/lib/api'
import { staggerContainer, fadeUpItem } from '@/lib/motion'

const statusLabel: Record<string, string> = {
  active: 'Faol',
  completed: 'Yakunlangan',
  cancelled: 'Bekor qilingan',
}

export function GroupBuyPage() {
  const [items, setItems] = useState<GroupBuyRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [products, setProducts] = useState<ProductRow[]>([])
  const [productId, setProductId] = useState('')
  const [required, setRequired] = useState('5')
  const [deadline, setDeadline] = useState('')
  const [saving, setSaving] = useState(false)
  const [expandedId, setExpandedId] = useState<number | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data } = await api.getGroupBuys()
      setItems(data.items)
    } catch {
      setError('Guruhli xaridlarni yuklab bo\'lmadi')
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    if (!modalOpen) return
    api.getProducts({ limit: 100 }).then((r) => setProducts(r.data.items)).catch(() => {})
  }, [modalOpen])

  async function create(e: React.FormEvent) {
    e.preventDefault()
    if (!productId) return
    setSaving(true)
    try {
      await api.createGroupBuy({
        product_id: Number(productId),
        required_participants: Number(required),
        deadline: deadline || null,
      })
      setModalOpen(false)
      load()
    } catch {
      setError('Yaratilmadi')
    } finally {
      setSaving(false)
    }
  }

  async function setStatus(id: number, status: 'completed' | 'cancelled') {
    await api.patchGroupBuy(id, { status })
    load()
  }

  async function remove(id: number) {
    if (!confirm('O\'chirasizmi?')) return
    await api.deleteGroupBuy(id)
    load()
  }

  return (
    <motion.div variants={staggerContainer} initial="initial" animate="animate">
      <PageHeader
        title="Guruhli xaridlar"
        description="Minimal odam soni, muddat, progress va ishtirokchilar."
        action={
          <div className="flex gap-2">
            <GlassButton onClick={load} disabled={loading}>
              <ArrowPathIcon className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
            </GlassButton>
            <GlassButton variant="primary" onClick={() => setModalOpen(true)}>
              <PlusIcon className="h-5 w-5" />
              Yangi
            </GlassButton>
          </div>
        }
      />

      <motion.div variants={fadeUpItem} className="space-y-4">
        {error && (
          <p className="rounded-2xl bg-accent-rose/15 px-4 py-2 text-sm text-rose-600">{error}</p>
        )}
        <PanelState loading={loading} empty={!loading && items.length === 0} emptyIcon={UserGroupIcon}>
          {items.map((g) => (
            <GlassPanel key={g.id} className="!p-5">
              <div className="flex flex-wrap items-start gap-4">
                {g.product_image && (
                  <img
                    src={mediaUrl(g.product_image)}
                    alt=""
                    className="h-16 w-16 rounded-2xl object-cover ring-1 ring-white/20"
                  />
                )}
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-ink-900 dark:text-white">{g.product_name}</h3>
                  <p className="text-sm text-ink-500">
                    {g.current_participants} / {g.required_participants} ishtirokchi ·{' '}
                    {statusLabel[g.status] ?? g.status}
                  </p>
                  {g.deadline && (
                    <p className="text-xs text-ink-400">
                      Muddat: {new Date(g.deadline).toLocaleString('uz-UZ')}
                    </p>
                  )}
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
                    <motion.div
                      className="h-full rounded-full bg-gradient-to-r from-brand-500 to-accent-cyan"
                      initial={{ width: 0 }}
                      animate={{ width: `${g.progress_percent}%` }}
                      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                    />
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {g.status === 'active' && (
                    <>
                      <GlassButton onClick={() => setStatus(g.id, 'completed')}>Yakunlash</GlassButton>
                      <GlassButton onClick={() => setStatus(g.id, 'cancelled')}>Bekor</GlassButton>
                    </>
                  )}
                  <GlassButton onClick={() => setExpandedId(expandedId === g.id ? null : g.id)}>
                    Ishtirokchilar
                  </GlassButton>
                  <GlassButton onClick={() => remove(g.id)}>
                    <TrashIcon className="h-4 w-4 text-rose-500" />
                  </GlassButton>
                </div>
              </div>
              {expandedId === g.id && (
                <ul className="mt-4 space-y-2 border-t border-white/10 pt-4">
                  {g.participants.length === 0 ? (
                    <li className="text-sm text-ink-500">Hali ishtirokchilar yo&apos;q</li>
                  ) : (
                    g.participants.map((p) => (
                      <li
                        key={p.id}
                        className="flex justify-between rounded-2xl bg-white/5 px-4 py-2 text-sm"
                      >
                        <span>{p.name}</span>
                        <span className="text-ink-500">{p.telegram_id}</span>
                      </li>
                    ))
                  )}
                </ul>
              )}
            </GlassPanel>
          ))}
        </PanelState>
      </motion.div>

      <GlassModal open={modalOpen} onClose={() => setModalOpen(false)} title="Guruhli xarid">
        <form onSubmit={create} className="space-y-4">
          <select className={selectClass} value={productId} onChange={(e) => setProductId(e.target.value)} required>
            <option value="">Mahsulot</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <input type="number" min={2} className={inputClass} value={required} onChange={(e) => setRequired(e.target.value)} placeholder="Minimal odam soni" required />
          <input type="datetime-local" className={inputClass} value={deadline} onChange={(e) => setDeadline(e.target.value)} />
          <div className="flex justify-end gap-3">
            <GlassButton type="button" onClick={() => setModalOpen(false)}>Bekor</GlassButton>
            <GlassButton type="submit" variant="primary" disabled={saving}>Yaratish</GlassButton>
          </div>
        </form>
      </GlassModal>
    </motion.div>
  )
}
