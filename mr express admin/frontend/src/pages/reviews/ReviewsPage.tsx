import { useCallback, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  ChatBubbleLeftRightIcon,
  ArrowPathIcon,
  CheckIcon,
  XMarkIcon,
  TrashIcon,
} from '@heroicons/react/24/outline'
import { PageHeader } from '@/components/ui/PageHeader'
import { GlassPanel } from '@/components/ui/GlassPanel'
import { GlassButton } from '@/components/ui/GlassButton'
import { SearchField } from '@/components/ui/SearchField'
import { PanelState } from '@/components/ui/PanelState'
import { api, type ReviewRow } from '@/lib/api'
import { cn } from '@/lib/utils'
import { staggerContainer, fadeUpItem } from '@/lib/motion'

export function ReviewsPage() {
  const [items, setItems] = useState<ReviewRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>('pending')
  const [ratingFilter, setRatingFilter] = useState<string>('')
  const [search, setSearch] = useState('')
  const [debouncedQ, setDebouncedQ] = useState('')

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(search.trim()), 300)
    return () => clearTimeout(t)
  }, [search])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data } = await api.getReviews({
        status: statusFilter || undefined,
        rating: ratingFilter ? Number(ratingFilter) : undefined,
        q: debouncedQ || undefined,
      })
      setItems(data.items)
    } catch {
      setError('Sharhlarni yuklab bo\'lmadi')
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [statusFilter, ratingFilter, debouncedQ])

  useEffect(() => {
    load()
  }, [load])

  async function approve(id: number) {
    await api.approveReview(id)
    load()
  }

  async function reject(id: number) {
    await api.rejectReview(id)
    load()
  }

  async function remove(id: number) {
    if (!confirm('Butunlay o\'chirasizmi?')) return
    await api.deleteReview(id)
    load()
  }

  return (
    <motion.div variants={staggerContainer} initial="initial" animate="animate">
      <PageHeader
        title="Sharhlar"
        description="Kutilayotgan navbat, tasdiqlash, reyting filtri va spam aniqlash."
        action={
          <GlassButton onClick={load} disabled={loading}>
            <ArrowPathIcon className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
            Yangilash
          </GlassButton>
        }
      />

      <motion.div variants={fadeUpItem}>
        <GlassPanel className="overflow-hidden !p-0">
          <div className="flex flex-col gap-4 border-b border-white/10 p-4 sm:flex-row sm:items-center">
            <SearchField
              value={search}
              onChange={setSearch}
              placeholder="Matn yoki mahsulot…"
              className="flex-1"
            />
            <div className="flex flex-wrap gap-2">
              {(['pending', 'approved', 'rejected', ''] as const).map((s) => (
                <button
                  key={s || 'all'}
                  type="button"
                  onClick={() => setStatusFilter(s)}
                  className={cn(
                    'rounded-full px-4 py-2 text-xs font-semibold transition-colors',
                    statusFilter === s
                      ? 'bg-brand-500/25 text-brand-700 dark:text-accent-cyan'
                      : 'bg-white/10 text-ink-500',
                  )}
                >
                  {s === 'pending'
                    ? 'Kutilmoqda'
                    : s === 'approved'
                      ? 'Tasdiqlangan'
                      : s === 'rejected'
                        ? 'Rad etilgan'
                        : 'Barchasi'}
                </button>
              ))}
            </div>
            <select
              value={ratingFilter}
              onChange={(e) => setRatingFilter(e.target.value)}
              className="frosted-pill px-4 py-2 text-sm"
            >
              <option value="">Barcha reytinglar</option>
              {[5, 4, 3, 2, 1].map((r) => (
                <option key={r} value={r}>
                  {r} yulduz
                </option>
              ))}
            </select>
          </div>

          {error && (
            <div className="border-b border-white/10 bg-accent-rose/10 px-6 py-3 text-sm text-rose-600">
              {error}
            </div>
          )}

          <PanelState
            loading={loading}
            empty={!loading && items.length === 0}
            emptyIcon={ChatBubbleLeftRightIcon}
            emptyText="Sharhlar topilmadi"
          >
            <ul className="divide-y divide-white/10">
              {items.map((r) => (
                <li key={r.id} className="p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium text-ink-900 dark:text-white">
                          {r.user_name}
                        </span>
                        <span className="text-amber-500">{'★'.repeat(r.rating)}</span>
                        <span className="text-xs text-ink-500">{r.product_name}</span>
                        {r.is_spam_suspect && (
                          <span className="rounded-full bg-accent-rose/20 px-2 py-0.5 text-[10px] font-bold uppercase text-rose-600">
                            Spam shubhasi
                          </span>
                        )}
                        <span
                          className={cn(
                            'rounded-full px-2 py-0.5 text-[10px] font-bold uppercase',
                            r.status === 'pending' && 'bg-amber-500/20 text-amber-700',
                            r.status === 'approved' && 'bg-emerald-500/20 text-emerald-700',
                            r.status === 'rejected' && 'bg-rose-500/20 text-rose-700',
                          )}
                        >
                          {r.status}
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-ink-600 dark:text-ink-300">
                        {r.content ?? '—'}
                      </p>
                      <p className="mt-1 text-xs text-ink-400">
                        {r.created_at
                          ? new Date(r.created_at).toLocaleString('uz-UZ')
                          : ''}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      {r.status === 'pending' && (
                        <>
                          <GlassButton onClick={() => approve(r.id)}>
                            <CheckIcon className="h-4 w-4 text-emerald-500" />
                            Tasdiqlash
                          </GlassButton>
                          <GlassButton onClick={() => reject(r.id)}>
                            <XMarkIcon className="h-4 w-4 text-rose-500" />
                            Rad
                          </GlassButton>
                        </>
                      )}
                      <GlassButton onClick={() => remove(r.id)}>
                        <TrashIcon className="h-4 w-4" />
                      </GlassButton>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </PanelState>
        </GlassPanel>
      </motion.div>
    </motion.div>
  )
}
