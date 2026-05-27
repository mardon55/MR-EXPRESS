import { useCallback, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { MoonIcon, PlusIcon, TrashIcon, PencilIcon } from '@heroicons/react/24/outline'
import { PageHeader } from '@/components/ui/PageHeader'
import { GlassPanel } from '@/components/ui/GlassPanel'
import { GlassButton } from '@/components/ui/GlassButton'
import { GlassModal } from '@/components/ui/GlassModal'
import { PanelState } from '@/components/ui/PanelState'
import { IOSSwitch } from '@/components/ui/IOSSwitch'
import { inputClass } from '@/lib/formStyles'
import { staggerContainer, fadeUpItem } from '@/lib/motion'

interface NightItem {
  id: number
  name: string
  image_url: string
  day_price: number
  night_discount_percent: number
  total_stock: number
  sold_count: number
  is_active: boolean
  created_at: string
}

const API = '/api/v1/night-market'

async function fetchItems(): Promise<NightItem[]> {
  const r = await fetch(API)
  const d = await r.json()
  return d.items ?? []
}

function nightPrice(dayPrice: number, pct: number) {
  return Math.round(dayPrice * (1 - pct / 100))
}

const EMPTY: Omit<NightItem, 'id' | 'created_at'> = {
  name: '',
  image_url: '',
  day_price: 0,
  night_discount_percent: 30,
  total_stock: 10,
  sold_count: 0,
  is_active: true,
}

export function NightMarketPage() {
  const [items, setItems] = useState<NightItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [editItem, setEditItem] = useState<NightItem | null>(null)
  const [form, setForm] = useState({ ...EMPTY })
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setItems(await fetchItems())
    } catch {
      setError("Ma'lumotlarni yuklab bo'lmadi")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  function openAdd() {
    setEditItem(null)
    setForm({ ...EMPTY })
    setModalOpen(true)
  }

  function openEdit(item: NightItem) {
    setEditItem(item)
    setForm({
      name: item.name,
      image_url: item.image_url,
      day_price: item.day_price,
      night_discount_percent: item.night_discount_percent,
      total_stock: item.total_stock,
      sold_count: item.sold_count,
      is_active: item.is_active,
    })
    setModalOpen(true)
  }

  function closeModal() {
    setModalOpen(false)
    setEditItem(null)
  }

  const handleSave = async () => {
    if (!form.name.trim() || form.day_price <= 0) return
    setSaving(true)
    try {
      const body = {
        name: form.name.trim(),
        image_url: form.image_url.trim(),
        day_price: Number(form.day_price),
        night_discount_percent: Number(form.night_discount_percent),
        total_stock: Number(form.total_stock),
        sold_count: Number(form.sold_count),
        is_active: form.is_active,
      }
      if (editItem) {
        await fetch(`${API}/${editItem.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
      } else {
        await fetch(API, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
      }
      closeModal()
      await load()
    } finally {
      setSaving(false)
    }
  }

  const handleToggleActive = async (item: NightItem) => {
    await fetch(`${API}/${item.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !item.is_active }),
    })
    setItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, is_active: !i.is_active } : i))
    )
  }

  const handleDelete = async (id: number) => {
    if (!confirm("O'chirishni tasdiqlaysizmi?")) return
    setDeletingId(id)
    try {
      await fetch(`${API}/${id}`, { method: 'DELETE' })
      setItems((prev) => prev.filter((i) => i.id !== id))
    } finally {
      setDeletingId(null)
    }
  }

  const set = (k: keyof typeof form, v: unknown) =>
    setForm((prev) => ({ ...prev, [k]: v }))

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6 p-6"
    >
      <PageHeader
        icon={<MoonIcon className="h-5 w-5" />}
        title="Tungi bozor"
        description="Flash sale mahsulotlari — har kuni 22:00–02:00"
        action={
          <GlassButton icon={<PlusIcon className="h-4 w-4" />} onClick={openAdd}>
            Mahsulot qo'shish
          </GlassButton>
        }
      />

      {error && (
        <div className="rounded-xl bg-red-500/10 px-4 py-3 text-[13px] text-red-500">
          {error}{' '}
          <button onClick={load} className="underline">Qayta urinish</button>
        </div>
      )}
      <PanelState loading={loading} empty={!loading && !error && items.length === 0}
        emptyText="Tungi bozorga mahsulot qo'shish uchun yuqoridagi tugmani bosing"
      >
        <motion.ul variants={staggerContainer} initial="hidden" animate="show" className="space-y-3">
          {items.map((item) => {
            const night = nightPrice(item.day_price, item.night_discount_percent)
            const pct = Math.min(100, Math.round((item.sold_count / item.total_stock) * 100))
            const left = Math.max(0, item.total_stock - item.sold_count)
            return (
              <motion.li key={item.id} variants={fadeUpItem}>
                <GlassPanel className="flex items-center gap-4 p-4">
                  {item.image_url ? (
                    <img
                      src={item.image_url}
                      alt=""
                      className="h-14 w-14 shrink-0 rounded-xl object-cover ring-1 ring-white/10"
                    />
                  ) : (
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-white/5 ring-1 ring-white/10">
                      <MoonIcon className="h-6 w-6 text-ink-400" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="truncate text-[14px] font-semibold text-ink-900 dark:text-white">
                        {item.name}
                      </p>
                      <IOSSwitch checked={item.is_active} onChange={() => handleToggleActive(item)} />
                    </div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[12px]">
                      <span className="text-ink-400 line-through">
                        {item.day_price.toLocaleString('uz-UZ')} so'm
                      </span>
                      <span className="font-bold text-brand-500">
                        {night.toLocaleString('uz-UZ')} so'm
                      </span>
                      <span className="rounded-full bg-brand-500/10 px-2 py-0.5 font-semibold text-brand-600 dark:text-brand-400">
                        -{item.night_discount_percent}%
                      </span>
                    </div>
                    <div className="mt-1.5">
                      <div className="mb-1 flex justify-between text-[11px] text-ink-400">
                        <span>{pct}% sotildi</span>
                        <span>{left} ta qoldi / {item.total_stock} ta</span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-ink-100 dark:bg-ink-800">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-brand-500 to-brand-400 transition-[width]"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <button
                      onClick={() => openEdit(item)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-400 transition hover:bg-white/10 hover:text-ink-700 dark:hover:text-white"
                    >
                      <PencilIcon className="h-4 w-4" />
                    </button>
                    <button
                      disabled={deletingId === item.id}
                      onClick={() => handleDelete(item.id)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-red-400 transition hover:bg-red-500/10 disabled:opacity-50"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                </GlassPanel>
              </motion.li>
            )
          })}
        </motion.ul>
      </PanelState>

      <GlassModal open={modalOpen} onClose={closeModal} title={editItem ? 'Mahsulotni tahrirlash' : "Yangi mahsulot qo'shish"}>
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-ink-500">
              Mahsulot nomi *
            </label>
            <input
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              placeholder="Masalan: Bluetooth quloqchin"
              className={inputClass}
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-ink-500">
              Rasm URL
            </label>
            <input
              value={form.image_url}
              onChange={(e) => set('image_url', e.target.value)}
              placeholder="https://..."
              className={inputClass}
            />
            {form.image_url && (
              <img
                src={form.image_url}
                alt=""
                className="mt-2 h-20 w-20 rounded-xl object-cover ring-1 ring-white/10"
                onError={(e) => (e.currentTarget.style.display = 'none')}
              />
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-ink-500">
                Kunduzi narxi (so'm) *
              </label>
              <input
                type="number"
                min="0"
                value={form.day_price}
                onChange={(e) => set('day_price', e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-ink-500">
                Tungi chegirma (%)
              </label>
              <input
                type="number"
                min="1"
                max="99"
                value={form.night_discount_percent}
                onChange={(e) => set('night_discount_percent', e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          {Number(form.day_price) > 0 && (
            <p className="rounded-lg bg-brand-500/10 px-3 py-2 text-xs font-medium text-brand-600 dark:text-brand-400">
              Tungi narx: {nightPrice(Number(form.day_price), Number(form.night_discount_percent)).toLocaleString('uz-UZ')} so'm
            </p>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-ink-500">
                Umumiy zaxira
              </label>
              <input
                type="number"
                min="1"
                value={form.total_stock}
                onChange={(e) => set('total_stock', e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-ink-500">
                Sotilgan (dona)
              </label>
              <input
                type="number"
                min="0"
                value={form.sold_count}
                onChange={(e) => set('sold_count', e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          <div className="flex items-center justify-between rounded-xl bg-white/5 px-4 py-3">
            <div>
              <p className="text-[13px] font-semibold text-ink-900 dark:text-white">Faol holat</p>
              <p className="text-[11px] text-ink-400">Foydalanuvchilarga ko'rsatilsinmi</p>
            </div>
            <IOSSwitch checked={form.is_active} onChange={(v) => set('is_active', v)} />
          </div>

          <div className="flex gap-3 pt-1">
            <button
              onClick={closeModal}
              className="flex-1 rounded-xl border border-white/20 py-3 text-[14px] font-semibold text-ink-600 dark:text-ink-300"
            >
              Bekor qilish
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !form.name.trim() || Number(form.day_price) <= 0}
              className="flex-1 rounded-xl bg-brand-500 py-3 text-[14px] font-semibold text-white shadow-lg transition hover:bg-brand-600 disabled:opacity-50"
            >
              {saving ? 'Saqlanmoqda...' : editItem ? 'Saqlash' : "Qo'shish"}
            </button>
          </div>
        </div>
      </GlassModal>
    </motion.div>
  )
}
