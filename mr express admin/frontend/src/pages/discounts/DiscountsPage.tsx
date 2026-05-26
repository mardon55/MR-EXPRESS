import { useCallback, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { TagIcon, PlusIcon, ArrowPathIcon, TrashIcon } from '@heroicons/react/24/outline'
import { PageHeader } from '@/components/ui/PageHeader'
import { GlassPanel } from '@/components/ui/GlassPanel'
import { GlassButton } from '@/components/ui/GlassButton'
import { GlassModal } from '@/components/ui/GlassModal'
import { PanelState } from '@/components/ui/PanelState'
import { IOSSwitch } from '@/components/ui/IOSSwitch'
import { inputClass, selectClass } from '@/lib/formStyles'
import { api, type CategoryNode, type DiscountRow, type ProductRow } from '@/lib/api'
import { staggerContainer, fadeUpItem } from '@/lib/motion'

const DAY_LABELS = ['Du', 'Se', 'Ch', 'Pa', 'Ju', 'Sh', 'Ya']

export function DiscountsPage() {
  const [items, setItems] = useState<DiscountRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [categories, setCategories] = useState<CategoryNode[]>([])
  const [products, setProducts] = useState<ProductRow[]>([])

  const [name, setName] = useState('')
  const [percent, setPercent] = useState('10')
  const [validFrom, setValidFrom] = useState('')
  const [validTo, setValidTo] = useState('')
  const [days, setDays] = useState<number[]>([])
  const [scopeType, setScopeType] = useState<'all' | 'category' | 'product'>('all')
  const [scopeId, setScopeId] = useState('')
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data } = await api.getDiscounts()
      setItems(data.items)
    } catch {
      setError('Chegirmalarni yuklab bo\'lmadi')
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
    api.getCategories().then((r) => setCategories(r.data.flat)).catch(() => {})
    api.getProducts({ limit: 100 }).then((r) => setProducts(r.data.items)).catch(() => {})
  }, [modalOpen])

  function toggleDay(d: number) {
    setDays((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].sort()))
  }

  async function create(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      await api.createDiscount({
        name: name.trim(),
        percent: Number(percent),
        valid_from: validFrom || null,
        valid_to: validTo || null,
        days_of_week: days.length ? days : [],
        scope_type: scopeType,
        scope_id: scopeId ? Number(scopeId) : null,
        is_active: true,
      })
      setModalOpen(false)
      setName('')
      setPercent('10')
      setValidFrom('')
      setValidTo('')
      setDays([])
      setScopeType('all')
      setScopeId('')
      load()
    } catch {
      setError('Chegirma yaratilmadi')
    } finally {
      setSaving(false)
    }
  }

  async function toggleActive(d: DiscountRow) {
    await api.patchDiscount(d.id, { is_active: !d.is_active })
    load()
  }

  async function remove(id: number) {
    if (!confirm('O\'chirasizmi?')) return
    await api.deleteDiscount(id)
    load()
  }

  return (
    <motion.div variants={staggerContainer} initial="initial" animate="animate">
      <PageHeader
        title="Chegirmalar"
        description="Foiz, muddat, hafta kunlari va katalog bo'yicha cheklovlar."
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

      <motion.div variants={fadeUpItem}>
        <GlassPanel className="overflow-hidden !p-0">
          {error && (
            <div className="border-b border-white/10 bg-accent-rose/10 px-6 py-3 text-sm text-rose-600">
              {error}
            </div>
          )}
          <PanelState loading={loading} empty={!loading && items.length === 0} emptyIcon={TagIcon}>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead>
                  <tr className="border-b border-white/20 bg-white/5 text-ink-500">
                    <th className="px-6 py-4">Nomi</th>
                    <th className="px-4 py-4">Foiz</th>
                    <th className="px-4 py-4">Muddat</th>
                    <th className="px-4 py-4">Kunlar</th>
                    <th className="px-4 py-4">Qamrov</th>
                    <th className="px-4 py-4">Faol</th>
                    <th className="px-6 py-4" />
                  </tr>
                </thead>
                <tbody>
                  {items.map((d) => (
                    <tr key={d.id} className="border-b border-white/10 last:border-0">
                      <td className="px-6 py-4 font-medium">{d.name}</td>
                      <td className="px-4 py-4">{d.percent}%</td>
                      <td className="px-4 py-4 text-xs text-ink-500">
                        {d.valid_from ? new Date(d.valid_from).toLocaleDateString('uz-UZ') : '—'}
                        {' — '}
                        {d.valid_to ? new Date(d.valid_to).toLocaleDateString('uz-UZ') : '—'}
                      </td>
                      <td className="px-4 py-4">
                        {d.days_of_week.length
                          ? d.days_of_week.map((i) => DAY_LABELS[i] ?? i).join(', ')
                          : 'Barcha kunlar'}
                      </td>
                      <td className="px-4 py-4 text-ink-600">
                        {d.scope_type === 'all'
                          ? 'Butun katalog'
                          : d.scope_name ?? d.scope_type}
                      </td>
                      <td className="px-4 py-4">
                        <IOSSwitch checked={d.is_active} onChange={() => toggleActive(d)} />
                      </td>
                      <td className="px-6 py-4">
                        <GlassButton onClick={() => remove(d.id)}>
                          <TrashIcon className="h-4 w-4 text-rose-500" />
                        </GlassButton>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </PanelState>
        </GlassPanel>
      </motion.div>

      <GlassModal open={modalOpen} onClose={() => setModalOpen(false)} title="Yangi chegirma">
        <form onSubmit={create} className="space-y-4">
          <input className={inputClass} placeholder="Nomi" value={name} onChange={(e) => setName(e.target.value)} required />
          <input type="number" className={inputClass} placeholder="Foiz" value={percent} onChange={(e) => setPercent(e.target.value)} min={1} max={100} required />
          <div className="grid gap-4 sm:grid-cols-2">
            <input type="datetime-local" className={inputClass} value={validFrom} onChange={(e) => setValidFrom(e.target.value)} />
            <input type="datetime-local" className={inputClass} value={validTo} onChange={(e) => setValidTo(e.target.value)} />
          </div>
          <div>
            <p className="mb-2 text-sm font-medium text-ink-600">Hafta kunlari</p>
            <div className="flex flex-wrap gap-2">
              {DAY_LABELS.map((label, i) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => toggleDay(i)}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                    days.includes(i)
                      ? 'bg-brand-500/30 text-brand-700 dark:text-accent-cyan'
                      : 'bg-white/10 text-ink-500'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <select className={selectClass} value={scopeType} onChange={(e) => setScopeType(e.target.value as typeof scopeType)}>
            <option value="all">Butun katalog</option>
            <option value="category">Kategoriya</option>
            <option value="product">Mahsulot</option>
          </select>
          {scopeType === 'category' && (
            <select className={selectClass} value={scopeId} onChange={(e) => setScopeId(e.target.value)}>
              <option value="">Tanlang</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          )}
          {scopeType === 'product' && (
            <select className={selectClass} value={scopeId} onChange={(e) => setScopeId(e.target.value)}>
              <option value="">Tanlang</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          )}
          <div className="flex justify-end gap-3">
            <GlassButton type="button" onClick={() => setModalOpen(false)}>Bekor</GlassButton>
            <GlassButton type="submit" variant="primary" disabled={saving}>
              {saving ? 'Saqlanmoqda…' : 'Yaratish'}
            </GlassButton>
          </div>
        </form>
      </GlassModal>
    </motion.div>
  )
}
