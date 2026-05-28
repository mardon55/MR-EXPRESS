import { useCallback, useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { UserGroupIcon, PlusIcon, ArrowPathIcon, TrashIcon, PhotoIcon, XMarkIcon } from '@heroicons/react/24/outline'
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
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
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

  function handleImagePick(file: File | null) {
    if (imagePreview) URL.revokeObjectURL(imagePreview)
    setImageFile(file)
    setImagePreview(file ? URL.createObjectURL(file) : null)
  }

  function resetForm() {
    setProductId('')
    setRequired('5')
    setDeadline('')
    if (imagePreview) URL.revokeObjectURL(imagePreview)
    setImageFile(null)
    setImagePreview(null)
  }

  async function create(e: React.FormEvent) {
    e.preventDefault()
    if (!productId) return
    setSaving(true)
    try {
      const fd = new FormData()
      fd.append('product_id', productId)
      fd.append('required_participants', required)
      if (deadline) fd.append('deadline', deadline)
      if (imageFile) fd.append('image', imageFile)
      await api.createGroupBuy(fd)
      setModalOpen(false)
      resetForm()
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

      <GlassModal open={modalOpen} onClose={() => { setModalOpen(false); resetForm() }} title="Guruhli xarid">
        <form onSubmit={create} className="space-y-4">
          {/* Rasm */}
          <div>
            <label className="mb-2 block text-sm font-medium text-ink-600 dark:text-ink-300">
              Rasm (ixtiyoriy)
            </label>
            {imagePreview ? (
              <div className="relative inline-block">
                <img
                  src={imagePreview}
                  alt=""
                  className="h-28 w-28 rounded-2xl object-cover ring-1 ring-white/20"
                />
                <button
                  type="button"
                  onClick={() => handleImagePick(null)}
                  className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-ink-900/80 text-white"
                >
                  <XMarkIcon className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex h-28 w-28 flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-white/20 text-ink-400 transition-colors hover:border-brand-500/60 hover:text-brand-500"
              >
                <PhotoIcon className="h-7 w-7" />
                <span className="text-[11px] font-medium">Rasm qo'sh</span>
              </button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handleImagePick(e.target.files?.[0] ?? null)}
            />
          </div>

          <select className={selectClass} value={productId} onChange={(e) => setProductId(e.target.value)} required>
            <option value="">Mahsulot tanlang</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <input type="number" min={2} className={inputClass} value={required} onChange={(e) => setRequired(e.target.value)} placeholder="Minimal odam soni" required />
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-500">Muddat (ixtiyoriy)</label>
            <input type="datetime-local" className={inputClass} value={deadline} onChange={(e) => setDeadline(e.target.value)} />
          </div>
          <div className="flex justify-end gap-3">
            <GlassButton type="button" onClick={() => { setModalOpen(false); resetForm() }}>Bekor</GlassButton>
            <GlassButton type="submit" variant="primary" disabled={saving}>
              {saving ? 'Saqlanmoqda…' : 'Yaratish'}
            </GlassButton>
          </div>
        </form>
      </GlassModal>
    </motion.div>
  )
}
