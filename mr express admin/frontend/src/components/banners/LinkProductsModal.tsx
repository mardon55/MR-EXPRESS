import { useEffect, useState } from 'react'
import { GlassModal } from '@/components/ui/GlassModal'
import { GlassButton } from '@/components/ui/GlassButton'
import { api, type BannerRow, type ProductRow } from '@/lib/api'
import { cn } from '@/lib/utils'

interface LinkProductsModalProps {
  open: boolean
  banner: BannerRow | null
  onClose: () => void
  onSaved: () => void
}

export function LinkProductsModal({ open, banner, onClose, onSaved }: LinkProductsModalProps) {
  const [products, setProducts] = useState<ProductRow[]>([])
  const [selected, setSelected] = useState<number[]>([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open || !banner) return
    setSelected(banner.products.map((p) => p.id))
    api.getProducts({ limit: 100 }).then((res) => setProducts(res.data.items)).catch(() => setProducts([]))
  }, [open, banner])

  async function save() {
    if (!banner) return
    setSaving(true)
    try {
      await api.linkBannerProducts(banner.id, selected)
      onSaved()
      onClose()
    } finally {
      setSaving(false)
    }
  }

  function toggle(id: number) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    )
  }

  return (
    <GlassModal
      open={open}
      onClose={onClose}
      title="Mahsulotlarni bog'lash"
      description={banner ? `"${banner.title}" uchun mahsulotlar` : ''}
    >
      <ul className="max-h-64 space-y-2 overflow-y-auto">
        {products.map((p) => (
          <li key={p.id}>
            <button
              type="button"
              onClick={() => toggle(p.id)}
              className={cn(
                'flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left text-sm transition-colors',
                selected.includes(p.id)
                  ? 'border-brand-500/40 bg-brand-500/15'
                  : 'border-white/10 bg-white/5',
              )}
            >
              <span
                className={cn(
                  'flex h-5 w-5 shrink-0 items-center justify-center rounded-md border',
                  selected.includes(p.id) ? 'border-brand-500 bg-brand-500 text-white' : 'border-white/30',
                )}
              >
                {selected.includes(p.id) ? '✓' : ''}
              </span>
              {p.name}
            </button>
          </li>
        ))}
      </ul>
      <div className="mt-6 flex justify-end gap-3">
        <GlassButton type="button" onClick={onClose}>Bekor</GlassButton>
        <GlassButton type="button" variant="primary" onClick={save} disabled={saving}>
          {saving ? 'Saqlanmoqda…' : 'Bog\'lash'}
        </GlassButton>
      </div>
    </GlassModal>
  )
}
