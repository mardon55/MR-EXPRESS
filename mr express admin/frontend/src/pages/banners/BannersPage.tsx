import { useCallback, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { PhotoIcon, PlusIcon, ArrowPathIcon, LinkIcon, TrashIcon } from '@heroicons/react/24/outline'
import { PageHeader } from '@/components/ui/PageHeader'
import { GlassPanel } from '@/components/ui/GlassPanel'
import { GlassButton } from '@/components/ui/GlassButton'
import { PanelState } from '@/components/ui/PanelState'
import { IOSSwitch } from '@/components/ui/IOSSwitch'
import { BannerFormModal } from '@/components/banners/BannerFormModal'
import { LinkProductsModal } from '@/components/banners/LinkProductsModal'
import { api, mediaUrl, type BannerRow } from '@/lib/api'
import { staggerContainer, fadeUpItem } from '@/lib/motion'

export function BannersPage() {
  const [items, setItems] = useState<BannerRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [linkBanner, setLinkBanner] = useState<BannerRow | null>(null)
  const [previewId, setPreviewId] = useState<number | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data } = await api.getBanners()
      setItems(data.items)
    } catch {
      setError('Bannerlarni yuklab bo\'lmadi')
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function toggleActive(b: BannerRow) {
    try {
      await api.patchBanner(b.id, { is_active: !b.is_active })
      setItems((list) =>
        list.map((x) => (x.id === b.id ? { ...x, is_active: !b.is_active } : x)),
      )
    } catch {
      setError('Faollik yangilanmadi')
    }
  }

  async function remove(id: number) {
    if (!confirm('Bannerni o\'chirasizmi?')) return
    try {
      await api.deleteBanner(id)
      setItems((list) => list.filter((x) => x.id !== id))
    } catch {
      setError('O\'chirish amalga oshmadi')
    }
  }

  const preview = items.find((b) => b.id === previewId)

  return (
    <motion.div variants={staggerContainer} initial="initial" animate="animate">
      <PageHeader
        title="Bannerlar"
        description="Rasm yuklash, mahsulot bog'lash, tartib va oldindan ko'rish."
        action={
          <div className="flex gap-2">
            <GlassButton type="button" onClick={load} disabled={loading}>
              <ArrowPathIcon className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
            </GlassButton>
            <GlassButton type="button" variant="primary" onClick={() => setFormOpen(true)}>
              <PlusIcon className="h-5 w-5" />
              Yangi banner
            </GlassButton>
          </div>
        }
      />

      {error && (
        <p className="mb-4 rounded-2xl bg-accent-rose/15 px-4 py-2 text-sm text-rose-600">{error}</p>
      )}

      <motion.div variants={fadeUpItem}>
        <PanelState loading={loading} empty={!loading && items.length === 0} emptyIcon={PhotoIcon}>
          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {items.map((b) => (
              <GlassPanel key={b.id} className="overflow-hidden !p-0">
                <button
                  type="button"
                  className="relative block aspect-[2/1] w-full overflow-hidden"
                  onClick={() => setPreviewId(b.id)}
                >
                  {b.image_url ? (
                    <img
                      src={mediaUrl(b.image_url)}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center bg-white/5">
                      <PhotoIcon className="h-12 w-12 text-ink-400" />
                    </div>
                  )}
                  <span className="absolute bottom-2 left-2 rounded-full bg-ink-950/60 px-3 py-1 text-xs text-white backdrop-blur-ios">
                    Tartib: {b.sort_order}
                  </span>
                </button>
                <div className="space-y-3 p-4">
                  <div>
                    <h3 className="font-semibold text-ink-900 dark:text-white">{b.title}</h3>
                    {b.subtitle && <p className="text-sm text-ink-500">{b.subtitle}</p>}
                  </div>
                  <p className="text-xs text-ink-500">
                    {b.products.length} ta mahsulot bog&apos;langan
                  </p>
                  <IOSSwitch
                    checked={b.is_active}
                    onChange={() => toggleActive(b)}
                    label="Faol"
                  />
                  <div className="flex flex-wrap gap-2">
                    <GlassButton type="button" onClick={() => setLinkBanner(b)}>
                      <LinkIcon className="h-4 w-4" />
                      Bog&apos;lash
                    </GlassButton>
                    <GlassButton type="button" onClick={() => setPreviewId(b.id)}>
                      Ko&apos;rish
                    </GlassButton>
                    <GlassButton type="button" onClick={() => remove(b.id)}>
                      <TrashIcon className="h-4 w-4 text-rose-500" />
                    </GlassButton>
                  </div>
                </div>
              </GlassPanel>
            ))}
          </div>
        </PanelState>
      </motion.div>

      {preview && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <button
            type="button"
            className="absolute inset-0 bg-ink-950/50 backdrop-blur-sm"
            onClick={() => setPreviewId(null)}
            aria-label="Yopish"
          />
          <div className="frosted-glass-heavy relative z-10 max-w-lg overflow-hidden rounded-5xl shadow-frost-lg">
            {preview.image_url && (
              <img src={mediaUrl(preview.image_url)} alt="" className="aspect-video w-full object-cover" />
            )}
            <div className="p-6">
              <h2 className="text-xl font-bold">{preview.title}</h2>
              <p className="text-ink-500">{preview.subtitle}</p>
              {preview.products.length > 0 && (
                <ul className="mt-4 space-y-1 text-sm">
                  {preview.products.map((p) => (
                    <li key={p.id}>• {p.name}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </motion.div>
      )}

      <BannerFormModal open={formOpen} onClose={() => setFormOpen(false)} onSaved={load} />
      <LinkProductsModal
        open={!!linkBanner}
        banner={linkBanner}
        onClose={() => setLinkBanner(null)}
        onSaved={load}
      />
    </motion.div>
  )
}
