import { useCallback, useEffect, useState } from 'react'

import { motion } from 'framer-motion'

import { FilmIcon, PlusIcon, ArrowPathIcon, TrashIcon, VideoCameraIcon } from '@heroicons/react/24/outline'

import { PageHeader } from '@/components/ui/PageHeader'
import { GlassPanel } from '@/components/ui/GlassPanel'
import { GlassButton } from '@/components/ui/GlassButton'
import { GlassModal } from '@/components/ui/GlassModal'
import { PanelState } from '@/components/ui/PanelState'
import { inputClass } from '@/lib/formStyles'
import { api, mediaUrl, type ReelRow } from '@/lib/api'
import { cn, formatCurrency } from '@/lib/utils'
import { staggerContainer, fadeUpItem } from '@/lib/motion'


export function ReelsPage() {
  const [items, setItems] = useState<ReelRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('')
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [videoPreview, setVideoPreview] = useState<string | null>(null)
  const [thumbFile, setThumbFile] = useState<File | null>(null)
  const [thumbPreview, setThumbPreview] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data } = await api.getReels()
      setItems(data.items)
    } catch {
      setError("Reels yuklab bo'lmadi")
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (!videoFile) { setVideoPreview(null); return }
    const url = URL.createObjectURL(videoFile)
    setVideoPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [videoFile])

  useEffect(() => {
    if (!thumbFile) { setThumbPreview(null); return }
    const url = URL.createObjectURL(thumbFile)
    setThumbPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [thumbFile])

  function resetForm() {
    setTitle('')
    setDescription('')
    setPrice('')
    setVideoFile(null)
    setThumbFile(null)
    setFormError(null)
  }

  function onVideoPick(file: File | null) {
    if (!file) { setVideoFile(null); return }
    if (!file.type.startsWith('video/')) {
      setFormError('Faqat video fayl tanlang (mp4, webm)')
      return
    }
    setFormError(null)
    setVideoFile(file)
  }

  async function create(e: React.FormEvent) {
    e.preventDefault()
    setFormError(null)

    if (!title.trim()) {
      setFormError('Mahsulot nomini kiriting')
      return
    }
    if (!price || Number(price) <= 0) {
      setFormError('Narxni kiriting')
      return
    }
    if (!videoFile) {
      setFormError('Videoni yuklang')
      return
    }

    const form = new FormData()
    form.append('title', title.trim())
    form.append('description', description.trim())
    form.append('price', String(Number(price)))
    form.append('video', videoFile)
    if (thumbFile) form.append('thumbnail', thumbFile)

    setSaving(true)
    try {
      await api.createReel(form)
      setModalOpen(false)
      resetForm()
      load()
    } catch {
      setFormError("Saqlanmadi — video fayl va maydonlarni tekshiring")
    } finally {
      setSaving(false)
    }
  }

  async function remove(id: number) {
    if (!confirm("Reelni o'chirasizmi?")) return
    try {
      await api.deleteReel(id)
      load()
    } catch {
      setError("O'chirish amalga oshmadi")
    }
  }

  return (
    <motion.div variants={staggerContainer} initial="initial" animate="animate">
      <PageHeader
        title="Reels"
        description="Mini app uchun mahsulot video reellari."
        action={
          <div className="flex gap-2">
            <GlassButton onClick={load} disabled={loading}>
              <ArrowPathIcon className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
            </GlassButton>
            <GlassButton variant="primary" onClick={() => setModalOpen(true)}>
              <PlusIcon className="h-5 w-5" />
              Yangi reel
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
          <PanelState loading={loading} empty={!loading && items.length === 0} emptyIcon={FilmIcon}>
            <div className="grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((r) => (
                <div
                  key={r.id}
                  className="overflow-hidden rounded-4xl border border-white/15 bg-white/5"
                >
                  <div className="relative aspect-[9/16] max-h-72 bg-ink-950">
                    {r.thumbnail_url ? (
                      <img
                        src={mediaUrl(r.thumbnail_url)}
                        alt={r.product_name ?? ''}
                        className="h-full w-full object-cover"
                      />
                    ) : null}
                    <video
                      src={mediaUrl(r.video_url)}
                      className={cn(
                        'h-full w-full object-cover',
                        r.thumbnail_url ? 'absolute inset-0 opacity-0 hover:opacity-100 transition-opacity' : ''
                      )}
                      controls
                      playsInline
                      preload="metadata"
                    />
                  </div>
                  <div className="space-y-2 p-4">
                    <p className="font-semibold text-ink-900 dark:text-white">
                      {r.product_name ?? 'Mahsulot'}
                    </p>
                    {r.product_description && (
                      <p className="line-clamp-2 text-sm text-ink-500 dark:text-ink-400">
                        {r.product_description}
                      </p>
                    )}
                    <p className="text-lg font-bold text-brand-600 dark:text-accent-cyan">
                      {formatCurrency(r.price)}
                    </p>
                    <GlassButton className="w-full justify-center" onClick={() => remove(r.id)}>
                      <TrashIcon className="h-4 w-4 text-rose-500" />
                      O&apos;chirish
                    </GlassButton>
                  </div>
                </div>
              ))}
            </div>
          </PanelState>
        </GlassPanel>
      </motion.div>

      <GlassModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); resetForm() }}
        title="Yangi reel"
        description="Mahsulot nomi, tavsif, narx, muqova va video kiriting"
        maxWidth="md"
      >
        <form onSubmit={create} className="space-y-5">

          {/* 1 — Mahsulot nomi */}
          <div>
            <label className="mb-2 block text-sm font-medium text-ink-600 dark:text-ink-300">
              Mahsulot nomi <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              className={inputClass}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Masalan: Qora ko'ylak"
              required
            />
          </div>

          {/* 2 — Tavsif (nom kiritilganda paydo bo'ladi) */}
          {title.trim() && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
            >
              <label className="mb-2 block text-sm font-medium text-ink-600 dark:text-ink-300">
                Tavsif
              </label>
              <textarea
                className={cn(inputClass, 'min-h-[80px] resize-none')}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Mahsulot haqida qisqacha ma'lumot..."
                rows={3}
              />
            </motion.div>
          )}

          {/* 3 — Narx */}
          {title.trim() && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: 0.05 }}
            >
              <label className="mb-2 block text-sm font-medium text-ink-600 dark:text-ink-300">
                Narx (so&apos;m) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                min={1}
                className={inputClass}
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="Masalan: 150000"
                required
              />
            </motion.div>
          )}

          {/* 4 — Muqova rasm */}
          {title.trim() && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: 0.1 }}
            >
              <label className="mb-2 block text-sm font-medium text-ink-600 dark:text-ink-300">
                Muqova rasm (ixtiyoriy)
              </label>
              <div className={cn(
                'relative overflow-hidden rounded-4xl border-2 border-dashed transition-colors',
                thumbFile ? 'border-brand-500/50 bg-brand-500/10' : 'border-white/25 bg-white/5',
              )}>
                {thumbPreview ? (
                  <div className="relative">
                    <img src={thumbPreview} alt="" className="max-h-40 w-full object-cover" />
                    <button
                      type="button"
                      className="absolute right-3 top-3 rounded-full bg-ink-900/70 px-3 py-1 text-xs text-white"
                      onClick={() => setThumbFile(null)}
                    >
                      Boshqa rasm
                    </button>
                  </div>
                ) : (
                  <label className="flex cursor-pointer flex-col items-center justify-center gap-2 px-6 py-6 text-center">
                    <span className="text-sm font-medium text-ink-600 dark:text-ink-300">Muqova rasmni tanlang</span>
                    <span className="text-xs text-ink-500">JPG, PNG, WebP</span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="sr-only"
                      onChange={(e) => setThumbFile(e.target.files?.[0] ?? null)}
                    />
                  </label>
                )}
              </div>
            </motion.div>
          )}

          {/* 5 — Video */}
          {title.trim() && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: 0.15 }}
            >
              <label className="mb-2 block text-sm font-medium text-ink-600 dark:text-ink-300">
                Video <span className="text-rose-500">*</span>
              </label>
              <div className={cn(
                'relative overflow-hidden rounded-4xl border-2 border-dashed transition-colors',
                videoFile ? 'border-brand-500/50 bg-brand-500/10' : 'border-white/25 bg-white/5',
              )}>
                {videoPreview ? (
                  <video
                    src={videoPreview}
                    className="aspect-[9/16] max-h-56 w-full object-cover"
                    controls
                    playsInline
                  />
                ) : (
                  <label className="flex cursor-pointer flex-col items-center justify-center gap-3 px-6 py-12 text-center">
                    <VideoCameraIcon className="h-12 w-12 text-ink-400" />
                    <span className="text-sm font-medium text-ink-600 dark:text-ink-300">
                      Videoni tanlang yoki sudrab tashlang
                    </span>
                    <span className="text-xs text-ink-500">MP4, WebM, MOV</span>
                    <input
                      type="file"
                      accept="video/mp4,video/webm,video/quicktime,video/*"
                      className="sr-only"
                      onChange={(e) => onVideoPick(e.target.files?.[0] ?? null)}
                    />
                  </label>
                )}
                {videoFile && (
                  <button
                    type="button"
                    className="absolute right-3 top-3 rounded-full bg-ink-900/70 px-3 py-1 text-xs text-white"
                    onClick={() => setVideoFile(null)}
                  >
                    Boshqa video
                  </button>
                )}
              </div>
            </motion.div>
          )}

          {formError && (
            <p className="rounded-2xl bg-accent-rose/15 px-4 py-2 text-sm text-rose-600">
              {formError}
            </p>
          )}

          <div className="flex justify-end gap-3">
            <GlassButton
              type="button"
              onClick={() => { setModalOpen(false); resetForm() }}
            >
              Bekor
            </GlassButton>
            <GlassButton type="submit" variant="primary" disabled={saving}>
              {saving ? 'Yuklanmoqda…' : 'Saqlash'}
            </GlassButton>
          </div>

        </form>
      </GlassModal>
    </motion.div>
  )
}
