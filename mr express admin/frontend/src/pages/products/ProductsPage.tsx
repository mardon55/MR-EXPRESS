import { useCallback, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { CubeIcon, PlusIcon, ArrowPathIcon } from '@heroicons/react/24/outline'
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
  const [error, setError] = useState<string | null>(null)

  const loadProducts = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data } = await api.getProducts({ limit: 100 })
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
            <GlassButton type="button" variant="primary" onClick={() => setModalOpen(true)}>
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
              <GlassButton variant="primary" onClick={() => setModalOpen(true)}>
                Birinchi mahsulotni qo&apos;shish
              </GlassButton>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead>
                  <tr className="border-b border-white/20 bg-white/5 text-ink-500 dark:border-white/10">
                    <th className="px-6 py-4 font-semibold">Rasm</th>
                    <th className="px-4 py-4 font-semibold">Nom</th>
                    <th className="px-4 py-4 font-semibold">Kategoriya</th>
                    <th className="px-4 py-4 font-semibold">Narx</th>
                    <th className="px-6 py-4 font-semibold">Ombor</th>
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
                            src={p.images[0].startsWith('http') ? p.images[0] : p.images[0]}
                            alt=""
                            className="h-12 w-12 rounded-2xl object-cover ring-1 ring-white/20"
                          />
                        ) : (
                          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-lg">
                            📦
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 font-medium text-ink-800 dark:text-ink-100">
                        {p.name}
                      </td>
                      <td className="px-4 py-3 text-ink-600">{p.category_name ?? '—'}</td>
                      <td className="px-4 py-3">{formatCurrency(p.price)}</td>
                      <td className="px-6 py-3 text-ink-600">{p.stock}</td>
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
        onClose={() => setModalOpen(false)}
        onCreated={loadProducts}
      />
    </motion.div>
  )
}
