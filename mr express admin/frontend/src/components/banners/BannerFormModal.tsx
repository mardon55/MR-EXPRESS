import { useState } from 'react'
import { GlassModal } from '@/components/ui/GlassModal'
import { GlassButton } from '@/components/ui/GlassButton'
import { IOSSwitch } from '@/components/ui/IOSSwitch'
import { inputClass } from '@/lib/formStyles'
import { api } from '@/lib/api'
import { ImageUploaderGrid } from '@/components/products/ImageUploaderGrid'

interface BannerFormModalProps {
  open: boolean
  onClose: () => void
  onSaved: () => void
}

export function BannerFormModal({ open, onClose, onSaved }: BannerFormModalProps) {
  const [title, setTitle] = useState('')
  const [subtitle, setSubtitle] = useState('')
  const [linkUrl, setLinkUrl] = useState('')
  const [sortOrder, setSortOrder] = useState('0')
  const [isActive, setIsActive] = useState(true)
  const [images, setImages] = useState<(File | null)[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function reset() {
    setTitle('')
    setSubtitle('')
    setLinkUrl('')
    setSortOrder('0')
    setIsActive(true)
    setImages([])
    setError(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) {
      setError('Sarlavha majburiy')
      return
    }
    const form = new FormData()
    form.append('title', title.trim())
    form.append('subtitle', subtitle)
    form.append('link_url', linkUrl)
    form.append('sort_order', sortOrder)
    form.append('is_active', String(isActive))
    const img = images.find(Boolean)
    if (img) form.append('image', img)

    setSaving(true)
    setError(null)
    try {
      await api.createBanner(form)
      reset()
      onSaved()
      onClose()
    } catch {
      setError('Banner saqlanmadi')
    } finally {
      setSaving(false)
    }
  }

  return (
    <GlassModal
      open={open}
      onClose={onClose}
      title="Yangi banner"
      description="Rasm yuklash (drag & drop) va ko'rinish sozlamalari"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="mb-2 block text-sm font-medium text-ink-600 dark:text-ink-300">
            Rasm (drag & drop)
          </label>
          <ImageUploaderGrid files={images.slice(0, 1)} onChange={(f) => setImages(f)} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium">Sarlavha</label>
            <input className={inputClass} value={title} onChange={(e) => setTitle(e.target.value)} required />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium">Tartib</label>
            <input
              type="number"
              className={inputClass}
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
            />
          </div>
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium">Pastki sarlavha</label>
          <input className={inputClass} value={subtitle} onChange={(e) => setSubtitle(e.target.value)} />
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium">Havola URL</label>
          <input className={inputClass} value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} />
        </div>
        <IOSSwitch checked={isActive} onChange={setIsActive} label="Faol" />
        {error && (
          <p className="rounded-2xl bg-accent-rose/15 px-4 py-2 text-sm text-rose-600">{error}</p>
        )}
        <div className="flex justify-end gap-3">
          <GlassButton type="button" onClick={onClose}>Bekor</GlassButton>
          <GlassButton type="submit" variant="primary" disabled={saving}>
            {saving ? 'Saqlanmoqda…' : 'Saqlash'}
          </GlassButton>
        </div>
      </form>
    </GlassModal>
  )
}
