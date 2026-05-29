import { useCallback, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { CubeIcon, PlusIcon, ArrowPathIcon, PencilSquareIcon, TrashIcon } from '@heroicons/react/24/outline'
import { PageHeader } from '@/components/ui/PageHeader'
import { GlassPanel } from '@/components/ui/GlassPanel'
import { GlassButton } from '@/components/ui/GlassButton'
import { AddProductModal } from '@/components/products/AddProductModal'
import { api, type ProductRow } from '@/lib/api'
import { formatCurrency } from '@/lib/utils'
import { staggerContainer, fadeUpItem } from '@/lib/motion'

export function ProductsPage() {
  const [products, setProducts] = useState<ProductRow[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editProduct, setEditProduct] = useState<ProductRow | null>(null)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  const loadProducts = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data } = await api.getProducts({ limit: 10000 })
      setProducts(data.items)
    } catch {
      setError('Mahsulotlarni yuklab bo\'lmadi')
      setProducts([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadProducts()
  }, [loadProducts])

  function openAdd() {
    setEditProduct(null)
    setModalOpen(true)
  }

  function openEdit(p: ProductRow) {
    setEditProduct(p)
    setModalOpen(true)
  }

  async function handleDelete(p: ProductRow) {
    if (!confirm(`"${p.name}" mahsulotini o'chirmoqchimisiz? Bu amalni qaytarib bo'lmaydi.`)) return
    setDeletingId(p.id)
    try {
      await api.deleteProduct(p.id)
      await loadProducts()
    } catch {
      setError(`"${p.name}" o'chirilmadi`)
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <motion.div variants={staggerContainer} initial="initial" animate="animate">
      <PageHeader
        title="Mahsulotlar"
        description="Katalog mahsulotlari — yangi qo'shish uchun tugmani bosing."
        action={
          <div className="flex gap-2">
            <GlassButton type="button" onClick={loadProducts} disabled={loading}>
              <ArrowPathIcon className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
            </GlassButton>
            <GlassButton type="button" variant="primary" onClick={openAdd}>
              <PlusIcon className="h-5 w-5" />
              Yangi qo&apos;shish
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

          {loading ? (
            <div className="flex min-h-[240px] items-center justify-center text-ink-500">
              Yuklanmoqda…
            </div>
          ) : products.length === 0 ? (
            <div className="flex min-h-[240px] flex-col items-center justify-center gap-3">
              <CubeIcon className="h-12 w-12 text-ink-400" />
              <p className="text-ink-500">Mahsulotlar topilmadi</p>
              <GlassButton variant="primary" onClick={openAdd}>
                Birinchi mahsulotni qo&apos;shish
              </GlassButton>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] text-left text-sm">
                <thead>
                  <tr className="border-b border-white/20 bg-white/5 text-ink-500 dark:border-white/10">
                    <th className="px-6 py-4 font-semibold">Rasm</th>
                    <th className="px-4 py-4 font-semibold">Nom</th>
                    <th className="px-4 py-4 font-semibold">Kategoriya</th>
                    <th className="px-4 py-4 font-semibold">Narx</th>
                    <th className="px-4 py-4 font-semibold">Ombor</th>
                    <th className="px-4 py-4 font-semibold">Holat</th>
                    <th className="px-6 py-4 font-semibold text-right">Amallar</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((p) => (
                    <tr
                      key={p.id}
                      className="border-b border-white/10 last:border-0 dark:border-white/5"
                    >
                      <td className="px-6 py-3">
                        {p.images?.[0] ? (
                          <img
                            src={p.images[0]}
                            alt=""
                            className="h-12 w-12 rounded-2xl object-cover ring-1 ring-white/20"
                          />
                        ) : (
                          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-lg">
                            📦
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 font-medium text-ink-800 dark:text-ink-100 max-w-[180px]">
                        <span className="line-clamp-2">{p.name}</span>
                      </td>
                      <td className="px-4 py-3 text-ink-600">{p.category_name ?? '—'}</td>
                      <td className="px-4 py-3">
                        <span className="font-semibold text-blue-600 dark:text-blue-400">
                          {formatCurrency(p.price)}
                        </span>
                        {p.old_price && p.old_price > p.price && (
                          <span className="ml-2 text-xs text-ink-400 line-through">
                            {formatCurrency(p.old_price)}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-ink-600">{p.stock}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {p.is_featured && (
                            <span className="rounded-xl bg-amber-400/20 px-2 py-0.5 text-[10px] font-bold text-amber-600">
                              ⭐ TOP
                            </span>
                          )}
                          {p.is_discount && (
                            <span className="rounded-xl bg-rose-400/20 px-2 py-0.5 text-[10px] font-bold text-rose-600">
                              🔥 AKSIYA
                            </span>
                          )}
                          {!p.is_featured && !p.is_discount && (
                            <span className="text-xs text-ink-400">Oddiy</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => openEdit(p)}
                            className="frosted-button !rounded-xl !p-2 text-blue-600 hover:bg-blue-500/10"
                            title="Tahrirlash"
                          >
                            <PencilSquareIcon className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(p)}
                            disabled={deletingId === p.id}
                            className="frosted-button !rounded-xl !p-2 text-rose-500 hover:bg-rose-500/10 disabled:opacity-40"
                            title="O'chirish"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </GlassPanel>
      </motion.div>

      <AddProductModal
        open={modalOpen}
        editProduct={editProduct}
        onClose={() => { setModalOpen(false); setEditProduct(null) }}
        onCreated={loadProducts}
      />
    </motion.div>
  )
}
