import { useCallback, useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import {
  TagIcon,
  PlusIcon,
  ArrowPathIcon,
  TrashIcon,
  PhotoIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'
import { PageHeader } from '@/components/ui/PageHeader'
import { GlassPanel } from '@/components/ui/GlassPanel'
import { GlassButton } from '@/components/ui/GlassButton'
import { GlassModal } from '@/components/ui/GlassModal'
import { PanelState } from '@/components/ui/PanelState'
import { IOSSwitch } from '@/components/ui/IOSSwitch'
import { inputClass, selectClass } from '@/lib/formStyles'
import { api, type CategoryNode, type DiscountRow, type ProductRow, mediaUrl } from '@/lib/api'
import { staggerContainer, fadeUpItem } from '@/lib/motion'

const DAY_LABELS = ['Du', 'Se', 'Ch', 'Pa', 'Ju', 'Sh', 'Ya']

export function DiscountsPage() {
  const [discountProducts, setDiscountProducts] = useState<ProductRow[]>([])
  const [loadingProducts, setLoadingProducts] = useState(true)

  const [items, setItems] = useState<DiscountRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [productModalOpen, setProductModalOpen] = useState(false)
  const [ruleModalOpen, setRuleModalOpen] = useState(false)

  const [categories, setCategories] = useState<CategoryNode[]>([])
  const [products, setProducts] = useState<ProductRow[]>([])

  // --- Discount product form ---
  const [pName, setPName] = useState('')
  const [pDescription, setPDescription] = useState('')
  const [pOldPrice, setPOldPrice] = useState('')
  const [pPrice, setPPrice] = useState('')
  const [pCategoryId, setPCategoryId] = useState('')
  const [pSubcategoryId, setPSubcategoryId] = useState('')
  const [pStock, setPStock] = useState('100')
  const [pValidTo, setPValidTo] = useState('')
  const [pImages, setPImages] = useState<File[]>([])
  const [pPreviews, setPPreviews] = useState<string[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [saving, setSaving] = useState(false)

  // --- Discount rule form ---
  const [name, setName] = useState('')
  const [percent, setPercent] = useState('10')
  const [validFrom, setValidFrom] = useState('')
  const [validTo, setValidTo] = useState('')
  const [days, setDays] = useState<number[]>([])
  const [scopeType, setScopeType] = useState<'all' | 'category' | 'product'>('all')
  const [scopeId, setScopeId] = useState('')
  const [ruleSaving, setRuleSaving] = useState(false)

  const loadDiscountProducts = useCallback(async () => {
    setLoadingProducts(true)
    try {
      const { data } = await api.getDiscountProducts()
      setDiscountProducts(data.items)
    } catch {
      setDiscountProducts([])
    } finally {
      setLoadingProducts(false)
    }
  }, [])

  const loadRules = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data } = await api.getDiscounts()
      setItems(data.items)
    } catch {
      setError("Chegirmalarni yuklab bo'lmadi")
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadDiscountProducts()
    loadRules()
  }, [loadDiscountProducts, loadRules])

  useEffect(() => {
    if (!productModalOpen && !ruleModalOpen) return
    api.getCategories().then((r) => setCategories(r.data.flat)).catch(() => {})
    if (ruleModalOpen) {
      api.getProducts({ limit: 200 }).then((r) => setProducts(r.data.items)).catch(() => {})
    }
  }, [productModalOpen, ruleModalOpen])

  // --- Image helpers ---
  function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || [])
    const remaining = 6 - pImages.length
    const newFiles = files.slice(0, remaining)
    setPImages((prev) => [...prev, ...newFiles])
    setPPreviews((prev) => [...prev, ...newFiles.map((f) => URL.createObjectURL(f))])
    e.target.value = ''
  }

  function removeImage(i: number) {
    URL.revokeObjectURL(pPreviews[i])
    setPImages((prev) => prev.filter((_, idx) => idx !== i))
    setPPreviews((prev) => prev.filter((_, idx) => idx !== i))
  }

  function resetProductForm() {
    setPName('')
    setPDescription('')
    setPOldPrice('')
    setPPrice('')
    setPCategoryId('')
    setPSubcategoryId('')
    setPStock('100')
    setPValidTo('')
    pPreviews.forEach((p) => URL.revokeObjectURL(p))
    setPImages([])
    setPPreviews([])
  }

  const parentCategories = categories.filter((c) => !c.parent_id)
  const subcategories = pCategoryId
    ? categories.filter((c) => c.parent_id === Number(pCategoryId))
    : []

  const computedPercent =
    pOldPrice && pPrice && Number(pOldPrice) > Number(pPrice)
      ? Math.round((1 - Number(pPrice) / Number(pOldPrice)) * 100)
      : null

  async function createDiscountProduct(e: React.FormEvent) {
    e.preventDefault()
    if (!pName.trim() || !pOldPrice || !pPrice || !pCategoryId) return
    setSaving(true)
    setError(null)
    try {
      const fd = new FormData()
      fd.append('name', pName.trim())
      fd.append('description', pDescription)
      fd.append('old_price', pOldPrice)
      fd.append('price', pPrice)
      fd.append('category_id', pCategoryId)
      if (pSubcategoryId) fd.append('subcategory_id', pSubcategoryId)
      fd.append('stock', pStock)
      if (pValidTo) fd.append('valid_to', pValidTo)
      pImages.forEach((img) => fd.append('images', img))
      await api.createDiscountProduct(fd)
      setProductModalOpen(false)
      resetProductForm()
      loadDiscountProducts()
      loadRules()
    } catch {
      setError('Chegirma mahsulot yaratilmadi')
    } finally {
      setSaving(false)
    }
  }

  async function removeDiscountProduct(productId: number) {
    if (!confirm("Bu chegirma mahsulotni o'chirasizmi?")) return
    await api.deleteProduct(productId)
    loadDiscountProducts()
    loadRules()
  }

  // --- Rule helpers ---
  function toggleDay(d: number) {
    setDays((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].sort()))
  }

  async function createRule(e: React.FormEvent) {
    e.preventDefault()
    setRuleSaving(true)
    setError(null)
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
      setRuleModalOpen(false)
      setName('')
      setPercent('10')
      setValidFrom('')
      setValidTo('')
      setDays([])
      setScopeType('all')
      setScopeId('')
      loadRules()
    } catch {
      setError('Chegirma yaratilmadi')
    } finally {
      setRuleSaving(false)
    }
  }

  async function toggleActive(d: DiscountRow) {
    await api.patchDiscount(d.id, { is_active: !d.is_active })
    loadRules()
  }

  async function removeRule(id: number) {
    if (!confirm("O'chirasizmi?")) return
    await api.deleteDiscount(id)
    loadRules()
  }

  return (
    <motion.div variants={staggerContainer} initial="initial" animate="animate" className="space-y-8">
      <PageHeader
        title="Chegirmalar"
        description="Chegirma mahsulotlar va qoidalarni boshqaring"
        action={
          <div className="flex gap-2">
            <GlassButton
              onClick={() => { loadDiscountProducts(); loadRules() }}
              disabled={loading || loadingProducts}
            >
              <ArrowPathIcon
                className={`h-5 w-5 ${loading || loadingProducts ? 'animate-spin' : ''}`}
              />
            </GlassButton>
            <GlassButton onClick={() => setRuleModalOpen(true)}>
              <TagIcon className="h-5 w-5" />
              Qoida
            </GlassButton>
            <GlassButton variant="primary" onClick={() => setProductModalOpen(true)}>
              <PlusIcon className="h-5 w-5" />
              Mahsulot
            </GlassButton>
          </div>
        }
      />

      {error && (
        <div className="rounded-2xl bg-rose-500/10 px-5 py-3 text-sm font-medium text-rose-600">
          {error}
        </div>
      )}

      {/* ── Chegirma mahsulotlar ── */}
      <motion.div variants={fadeUpItem}>
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-ink-400">
          Chegirma mahsulotlar
        </h2>

        {loadingProducts ? (
          <div className="flex justify-center py-10">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
          </div>
        ) : discountProducts.length === 0 ? (
          <GlassPanel className="flex flex-col items-center justify-center py-14 text-center">
            <TagIcon className="mb-3 h-12 w-12 text-ink-300" />
            <p className="text-sm text-ink-500">Hali chegirma mahsulot yo'q</p>
            <GlassButton
              variant="primary"
              className="mt-4"
              onClick={() => setProductModalOpen(true)}
            >
              <PlusIcon className="h-4 w-4" />
              Yangi chegirma mahsulot qo'shish
            </GlassButton>
          </GlassPanel>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {discountProducts.map((p) => {
              const disc =
                p.old_price && p.old_price > p.price
                  ? Math.round((1 - p.price / p.old_price) * 100)
                  : null
              const imgSrc = mediaUrl(p.images?.[0] || p.image_url)
              return (
                <GlassPanel key={p.id} className="group !p-0 overflow-hidden">
                  <div className="relative aspect-square bg-white/10">
                    {imgSrc ? (
                      <img
                        src={imgSrc}
                        alt={p.name}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <PhotoIcon className="h-10 w-10 text-ink-300" />
                      </div>
                    )}
                    {disc && (
                      <span className="absolute left-2 top-2 rounded-full bg-rose-500/90 px-2.5 py-0.5 text-[11px] font-bold text-white shadow-sm">
                        -{disc}%
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => removeDiscountProduct(p.id)}
                      className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/50 text-white opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100"
                    >
                      <TrashIcon className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="p-3">
                    <p className="line-clamp-2 text-[13px] font-semibold leading-snug">
                      {p.name}
                    </p>
                    {p.description && (
                      <p className="mt-1 line-clamp-1 text-[11px] text-ink-400">
                        {p.description}
                      </p>
                    )}
                    <div className="mt-2">
                      <p className="text-[14px] font-bold text-brand-500">
                        {p.price.toLocaleString()} so'm
                      </p>
                      {p.old_price && (
                        <p className="text-[11px] text-ink-400 line-through">
                          {p.old_price.toLocaleString()} so'm
                        </p>
                      )}
                    </div>
                  </div>
                </GlassPanel>
              )
            })}
          </div>
        )}
      </motion.div>

      {/* ── Chegirma qoidalari ── */}
      <motion.div variants={fadeUpItem}>
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-ink-400">
          Chegirma qoidalari
        </h2>
        <GlassPanel className="overflow-hidden !p-0">
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
                        {d.valid_from
                          ? new Date(d.valid_from).toLocaleDateString('uz-UZ')
                          : '—'}
                        {' — '}
                        {d.valid_to
                          ? new Date(d.valid_to).toLocaleDateString('uz-UZ')
                          : '—'}
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
                        <GlassButton onClick={() => removeRule(d.id)}>
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

      {/* ── Modal: Yangi chegirma mahsulot ── */}
      <GlassModal
        open={productModalOpen}
        onClose={() => { setProductModalOpen(false); resetProductForm() }}
        title="Yangi chegirma mahsulot"
        description="Mahsulot ma'lumotlarini to'ldiring — asosiy sahifada chegirmalar bo'limida chiqadi"
        maxWidth="xl"
      >
        <form onSubmit={createDiscountProduct} className="space-y-5">
          {/* Images */}
          <div>
            <p className="mb-2 text-sm font-semibold text-ink-700 dark:text-ink-200">
              Rasmlar (maksimal 6 ta)
            </p>
            <div className="flex flex-wrap gap-3">
              {pPreviews.map((src, i) => (
                <div
                  key={i}
                  className="group relative h-24 w-24 overflow-hidden rounded-2xl border border-white/20"
                >
                  <img src={src} alt="" className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeImage(i)}
                    className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100"
                  >
                    <XMarkIcon className="h-6 w-6 text-white" />
                  </button>
                  {i === 0 && (
                    <span className="absolute bottom-1 left-1 rounded-full bg-black/60 px-1.5 py-0.5 text-[9px] font-semibold text-white">
                      Asosiy
                    </span>
                  )}
                </div>
              ))}
              {pImages.length < 6 && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex h-24 w-24 flex-col items-center justify-center gap-1.5 rounded-2xl border-2 border-dashed border-white/20 text-ink-400 transition-colors hover:border-brand-500/60 hover:text-brand-500"
                >
                  <PhotoIcon className="h-7 w-7" />
                  <span className="text-[11px] font-medium">Rasm qo'sh</span>
                </button>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleImageSelect}
            />
          </div>

          {/* Name */}
          <input
            className={inputClass}
            placeholder="Mahsulot nomi *"
            value={pName}
            onChange={(e) => setPName(e.target.value)}
            required
          />

          {/* Category + Subcategory */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-ink-500">
                Kategoriya *
              </label>
              <select
                className={selectClass}
                value={pCategoryId}
                onChange={(e) => { setPCategoryId(e.target.value); setPSubcategoryId('') }}
                required
              >
                <option value="">Kategoriya tanlang</option>
                {parentCategories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.icon} {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-ink-500">
                Sub-kategoriya
              </label>
              <select
                className={selectClass}
                value={pSubcategoryId}
                onChange={(e) => setPSubcategoryId(e.target.value)}
                disabled={subcategories.length === 0}
              >
                <option value="">
                  {subcategories.length === 0 ? 'Kategoriya tanlang avval' : 'Sub-kategoriya (ixtiyoriy)'}
                </option>
                {subcategories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Description */}
          <textarea
            className={`${inputClass} resize-none`}
            placeholder="Tavsif (ixtiyoriy)"
            rows={3}
            value={pDescription}
            onChange={(e) => setPDescription(e.target.value)}
          />

          {/* Prices */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-ink-500">
                Asl narx (so'm) *
              </label>
              <input
                type="number"
                className={inputClass}
                placeholder="Masalan: 150 000"
                value={pOldPrice}
                onChange={(e) => setPOldPrice(e.target.value)}
                min={1}
                required
              />
            </div>
            <div>
              <label className="mb-1 flex items-center gap-2 text-xs font-medium text-ink-500">
                Chegirma narxi (so'm) *
                {computedPercent !== null && (
                  <span className="rounded-full bg-rose-500/15 px-2 py-0.5 text-[11px] font-bold text-rose-500">
                    -{computedPercent}% chegirma
                  </span>
                )}
              </label>
              <input
                type="number"
                className={inputClass}
                placeholder="Masalan: 120 000"
                value={pPrice}
                onChange={(e) => setPPrice(e.target.value)}
                min={1}
                required
              />
            </div>
          </div>

          {/* Stock + Expiry */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-ink-500">
                Zaxira miqdori (dona)
              </label>
              <input
                type="number"
                className={inputClass}
                value={pStock}
                onChange={(e) => setPStock(e.target.value)}
                min={0}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-ink-500">
                Chegirma muddati (tugash sanasi)
              </label>
              <input
                type="datetime-local"
                className={inputClass}
                value={pValidTo}
                onChange={(e) => setPValidTo(e.target.value)}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-1">
            <GlassButton
              type="button"
              onClick={() => { setProductModalOpen(false); resetProductForm() }}
            >
              Bekor
            </GlassButton>
            <GlassButton type="submit" variant="primary" disabled={saving}>
              {saving ? 'Saqlanmoqda…' : 'Yaratish'}
            </GlassButton>
          </div>
        </form>
      </GlassModal>

      {/* ── Modal: Yangi chegirma qoidasi ── */}
      <GlassModal
        open={ruleModalOpen}
        onClose={() => setRuleModalOpen(false)}
        title="Yangi chegirma qoidasi"
        description="Foiz, muddat va qamrov asosida chegirma qoidasi"
      >
        <form onSubmit={createRule} className="space-y-4">
          <input
            className={inputClass}
            placeholder="Nomi"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <input
            type="number"
            className={inputClass}
            placeholder="Foiz (%)"
            value={percent}
            onChange={(e) => setPercent(e.target.value)}
            min={1}
            max={100}
            required
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs text-ink-500">Boshlanish</label>
              <input
                type="datetime-local"
                className={inputClass}
                value={validFrom}
                onChange={(e) => setValidFrom(e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-ink-500">Tugash</label>
              <input
                type="datetime-local"
                className={inputClass}
                value={validTo}
                onChange={(e) => setValidTo(e.target.value)}
              />
            </div>
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
          <select
            className={selectClass}
            value={scopeType}
            onChange={(e) => setScopeType(e.target.value as typeof scopeType)}
          >
            <option value="all">Butun katalog</option>
            <option value="category">Kategoriya</option>
            <option value="product">Mahsulot</option>
          </select>
          {scopeType === 'category' && (
            <select
              className={selectClass}
              value={scopeId}
              onChange={(e) => setScopeId(e.target.value)}
            >
              <option value="">Tanlang</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          )}
          {scopeType === 'product' && (
            <select
              className={selectClass}
              value={scopeId}
              onChange={(e) => setScopeId(e.target.value)}
            >
              <option value="">Tanlang</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          )}
          <div className="flex justify-end gap-3">
            <GlassButton type="button" onClick={() => setRuleModalOpen(false)}>
              Bekor
            </GlassButton>
            <GlassButton type="submit" variant="primary" disabled={ruleSaving}>
              {ruleSaving ? 'Saqlanmoqda…' : 'Yaratish'}
            </GlassButton>
          </div>
        </form>
      </GlassModal>
    </motion.div>
  )
}
