import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { XMarkIcon } from '@heroicons/react/24/outline'
import { GlassButton } from '@/components/ui/GlassButton'
import { api, type CategoryNode } from '@/lib/api'
import { ImageUploaderGrid } from './ImageUploaderGrid'
import { CategoryDependentSelect } from './CategoryDependentSelect'
import { RichTextEditor } from './RichTextEditor'
import { cn } from '@/lib/utils'

interface AddProductModalProps {
  open: boolean
  onClose: () => void
  onCreated: () => void
}

const inputClass = cn(
  'frosted-pill w-full px-4 py-3 text-sm font-medium text-ink-800 outline-none',
  'placeholder:text-ink-400 dark:text-ink-100',
)

export function AddProductModal({ open, onClose, onCreated }: AddProductModalProps) {
  const [categories, setCategories] = useState<CategoryNode[]>([])
  const [name, setName] = useState('')
  const [price, setPrice] = useState('')
  const [stock, setStock] = useState('100')
  const [categoryId, setCategoryId] = useState<number | ''>('')
  const [subcategoryId, setSubcategoryId] = useState<number | ''>('')
  const [description, setDescription] = useState('')
  const [images, setImages] = useState<(File | null)[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    api
      .getCategories()
      .then((res) => setCategories(res.data.items))
      .catch(() => setError('Kategoriyalarni yuklab bo\'lmadi'))
  }, [open])

  function reset() {
    setName('')
    setPrice('')
    setStock('100')
    setCategoryId('')
    setSubcategoryId('')
    setDescription('')
    setImages([])
    setError(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!name.trim() || !price || !categoryId) {
      setError('Nom, narx va kategoriya majburiy')
      return
    }

    const form = new FormData()
    form.append('name', name.trim())
    form.append('description', description)
    form.append('price', String(Number(price)))
    form.append('stock', String(Number(stock) || 100))
    form.append('category_id', String(categoryId))
    if (subcategoryId) form.append('subcategory_id', String(subcategoryId))
    images.forEach((file) => {
      if (file) form.append('images', file)
    })

    setSaving(true)
    try {
      await api.createProduct(form)
      reset()
      onCreated()
      onClose()
    } catch {
      setError('Mahsulot saqlanmadi. Backend ishlayotganini tekshiring.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <button
            type="button"
            className="absolute inset-0 bg-ink-950/40 backdrop-blur-sm"
            aria-label="Yopish"
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-labelledby="add-product-title"
            className="frosted-glass-heavy relative z-10 max-h-[90vh] w-full max-w-2xl overflow-y-auto p-6 shadow-frost-lg"
            initial={{ scale: 0.95, y: 16 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.95, y: 16 }}
          >
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <h2 id="add-product-title" className="text-xl font-bold text-ink-900 dark:text-white">
                  Yangi mahsulot
                </h2>
                <p className="mt-1 text-sm text-ink-500">6 tagacha rasm, kategoriya va tavsif</p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="frosted-button !rounded-2xl !p-2"
                aria-label="Modalni yopish"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="mb-2 block text-sm font-medium text-ink-600 dark:text-ink-300">
                  Rasmlar (6 ta gacha)
                </label>
                <ImageUploaderGrid files={images} onChange={setImages} />
              </div>

              <CategoryDependentSelect
                categories={categories}
                categoryId={categoryId}
                subcategoryId={subcategoryId}
                onCategoryChange={setCategoryId}
                onSubcategoryChange={setSubcategoryId}
              />

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-ink-600 dark:text-ink-300">
                    Mahsulot nomi
                  </label>
                  <input
                    className={inputClass}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Masalan: iPhone 15 Pro"
                    required
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-ink-600 dark:text-ink-300">
                    Narx (so&apos;m)
                  </label>
                  <input
                    type="number"
                    min={0}
                    className={inputClass}
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-ink-600 dark:text-ink-300">
                  Ombor miqdori
                </label>
                <input
                  type="number"
                  min={0}
                  className={inputClass}
                  value={stock}
                  onChange={(e) => setStock(e.target.value)}
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-ink-600 dark:text-ink-300">
                  Tavsif
                </label>
                <RichTextEditor value={description} onChange={setDescription} />
              </div>

              {error && (
                <p className="rounded-2xl bg-accent-rose/15 px-4 py-2 text-sm text-rose-600 dark:text-accent-rose">
                  {error}
                </p>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <GlassButton type="button" onClick={onClose}>
                  Bekor qilish
                </GlassButton>
                <GlassButton type="submit" variant="primary" disabled={saving}>
                  {saving ? 'Saqlanmoqda…' : 'Saqlash'}
                </GlassButton>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
