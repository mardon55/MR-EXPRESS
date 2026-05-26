import { useCallback, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { TicketIcon, PlusIcon, ArrowPathIcon, TrashIcon, ChartBarIcon } from '@heroicons/react/24/outline'
import { PageHeader } from '@/components/ui/PageHeader'
import { GlassPanel } from '@/components/ui/GlassPanel'
import { GlassButton } from '@/components/ui/GlassButton'
import { GlassModal } from '@/components/ui/GlassModal'
import { PanelState } from '@/components/ui/PanelState'
import { IOSSwitch } from '@/components/ui/IOSSwitch'
import { inputClass } from '@/lib/formStyles'
import { api, type PromocodeRow } from '@/lib/api'
import { staggerContainer, fadeUpItem } from '@/lib/motion'

const CODE_PATTERN = /^[A-Z0-9]{3,32}$/

function normalizeCode(raw: string): string {
  return raw.toUpperCase().replace(/[^A-Z0-9]/g, '')
}

export function PromocodesPage() {
  const [items, setItems] = useState<PromocodeRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [code, setCode] = useState('')
  const [percent, setPercent] = useState('')
  const [expiresAt, setExpiresAt] = useState('')
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [statsId, setStatsId] = useState<number | null>(null)
  const [stats, setStats] = useState<Awaited<ReturnType<typeof api.getPromocodeStats>>['data'] | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data } = await api.getPromocodes()
      setItems(data.items)
    } catch {
      setError('Promokodlarni yuklab bo\'lmadi')
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  function resetForm() {
    setCode('')
    setPercent('')
    setExpiresAt('')
    setFormError(null)
  }

  function openCreateModal() {
    resetForm()
    setModalOpen(true)
  }

  async function create(e: React.FormEvent) {
    e.preventDefault()
    setFormError(null)

    const normalized = normalizeCode(code)
    if (!CODE_PATTERN.test(normalized)) {
      setFormError('Kod kamida 3 ta harf yoki raqamdan iborat bo\'lishi kerak (masalan: SALE20)')
      return
    }

    const discountPercent = Number(percent)
    if (!Number.isFinite(discountPercent) || discountPercent <= 0 || discountPercent > 100) {
      setFormError('Chegirma foizi 1 dan 100 gacha bo\'lishi kerak')
      return
    }

    if (!expiresAt.trim()) {
      setFormError('Amal qilish muddatini tanlang')
      return
    }

    setSaving(true)
    try {
      await api.createPromocode({
        code: normalized,
        discount_percent: discountPercent,
        max_uses: null,
        expires_at: new Date(expiresAt).toISOString(),
        is_active: true,
      })
      setModalOpen(false)
      resetForm()
      load()
    } catch {
      setFormError('Promokod yaratilmadi — kod band bo\'lishi mumkin')
    } finally {
      setSaving(false)
    }
  }

  async function openStats(id: number) {
    setStatsId(id)
    setStats(null)
    try {
      const { data } = await api.getPromocodeStats(id)
      setStats(data)
    } catch {
      setStats(null)
    }
  }

  async function toggleActive(p: PromocodeRow) {
    await api.patchPromocode(p.id, { is_active: !p.is_active })
    load()
  }

  async function remove(id: number) {
    if (!confirm('O\'chirasizmi?')) return
    await api.deletePromocode(id)
    load()
  }

  return (
    <motion.div variants={staggerContainer} initial="initial" animate="animate">
      <PageHeader
        title="Promokodlar"
        description="Kod, chegirma foizi va amal qilish muddatini o'zingiz belgilang."
        action={
          <div className="flex gap-2">
            <GlassButton onClick={load} disabled={loading}>
              <ArrowPathIcon className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
            </GlassButton>
            <GlassButton variant="primary" onClick={openCreateModal}>
              <PlusIcon className="h-5 w-5" />
              Yaratish
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
          <PanelState loading={loading} empty={!loading && items.length === 0} emptyIcon={TicketIcon}>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[680px] text-left text-sm">
                <thead>
                  <tr className="border-b border-white/20 bg-white/5 text-ink-500">
                    <th className="px-6 py-4">Kod</th>
                    <th className="px-4 py-4">Foiz</th>
                    <th className="px-4 py-4">Ishlatilgan</th>
                    <th className="px-4 py-4">Tugash</th>
                    <th className="px-4 py-4">Faol</th>
                    <th className="px-6 py-4" />
                  </tr>
                </thead>
                <tbody>
                  {items.map((p) => (
                    <tr key={p.id} className="border-b border-white/10 last:border-0">
                      <td className="px-6 py-4 font-mono font-bold text-brand-600 dark:text-accent-cyan">
                        {p.code}
                      </td>
                      <td className="px-4 py-4">{p.discount_percent}%</td>
                      <td className="px-4 py-4">
                        {p.used_count}
                        {p.max_uses != null ? ` / ${p.max_uses}` : ''}
                      </td>
                      <td className="px-4 py-4 text-xs text-ink-500">
                        {p.expires_at
                          ? new Date(p.expires_at).toLocaleDateString('uz-UZ')
                          : '—'}
                      </td>
                      <td className="px-4 py-4">
                        <IOSSwitch checked={p.is_active} onChange={() => toggleActive(p)} />
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          <GlassButton onClick={() => openStats(p.id)}>
                            <ChartBarIcon className="h-4 w-4" />
                          </GlassButton>
                          <GlassButton onClick={() => remove(p.id)}>
                            <TrashIcon className="h-4 w-4 text-rose-500" />
                          </GlassButton>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </PanelState>
        </GlassPanel>
      </motion.div>

      <GlassModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false)
          resetForm()
        }}
        title="Promokod yaratish"
        description="Kod, chegirma foizi va amal qilish muddatini kiriting"
        maxWidth="md"
      >
        <form onSubmit={create} className="space-y-5">
          <div>
            <label className="mb-2 block text-sm font-medium text-ink-600 dark:text-ink-300">
              1. Promokod
            </label>
            <input
              type="text"
              className={`${inputClass} font-mono uppercase`}
              placeholder="Masalan: SALE20, MRX2025"
              value={code}
              onChange={(e) => setCode(normalizeCode(e.target.value))}
              maxLength={32}
              autoComplete="off"
              spellCheck={false}
              required
            />
            <p className="mt-1.5 text-xs text-ink-500">
              O&apos;zingiz xohlagan kodni yozing — faqat A–Z va 0–9, kamida 3 ta belgi
            </p>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-ink-600 dark:text-ink-300">
              2. Chegirma foizi (%)
            </label>
            <input
              type="number"
              className={inputClass}
              placeholder="Masalan: 10"
              value={percent}
              onChange={(e) => setPercent(e.target.value)}
              min={1}
              max={100}
              step={1}
              required
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-ink-600 dark:text-ink-300">
              3. Amal qilish muddati
            </label>
            <input
              type="datetime-local"
              className={inputClass}
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              required
            />
          </div>

          {formError && (
            <p className="rounded-2xl bg-accent-rose/15 px-4 py-2 text-sm text-rose-600">
              {formError}
            </p>
          )}

          <div className="flex justify-end gap-3">
            <GlassButton
              type="button"
              onClick={() => {
                setModalOpen(false)
                resetForm()
              }}
            >
              Bekor
            </GlassButton>
            <GlassButton type="submit" variant="primary" disabled={saving}>
              {saving ? 'Saqlanmoqda…' : 'Yaratish'}
            </GlassButton>
          </div>
        </form>
      </GlassModal>

      <GlassModal
        open={statsId !== null}
        onClose={() => setStatsId(null)}
        title="Statistika"
        description={stats?.item.code}
      >
        {stats ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-2xl bg-white/5 p-3">
                <p className="text-ink-500">Ishlatilgan</p>
                <p className="text-xl font-bold">{stats.item.used_count}</p>
              </div>
              <div className="rounded-2xl bg-white/5 p-3">
                <p className="text-ink-500">Qolgan</p>
                <p className="text-xl font-bold">
                  {stats.item.remaining_uses ?? '∞'}
                </p>
              </div>
            </div>
            <h4 className="text-sm font-semibold">Qo&apos;llanilganlar</h4>
            {stats.applications.length === 0 ? (
              <p className="text-sm text-ink-500">Hali ishlatilmagan</p>
            ) : (
              <ul className="max-h-48 space-y-2 overflow-y-auto text-sm">
                {stats.applications.map((a, i) => (
                  <li key={i} className="flex justify-between rounded-xl bg-white/5 px-3 py-2">
                    <span>{a.user_name}</span>
                    <span className="text-ink-500">{a.used_at}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : (
          <p className="text-ink-500">Yuklanmoqda…</p>
        )}
      </GlassModal>
    </motion.div>
  )
}
