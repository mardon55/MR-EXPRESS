import { useCallback, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  UsersIcon,
  ArrowPathIcon,
  ArrowDownTrayIcon,
  EyeIcon,
} from '@heroicons/react/24/outline'
import { PageHeader } from '@/components/ui/PageHeader'
import { GlassPanel } from '@/components/ui/GlassPanel'
import { GlassButton } from '@/components/ui/GlassButton'
import { GlassModal } from '@/components/ui/GlassModal'
import { SearchField } from '@/components/ui/SearchField'
import { PanelState } from '@/components/ui/PanelState'
import { IOSSwitch } from '@/components/ui/IOSSwitch'
import { api, downloadBlob, type UserRow } from '@/lib/api'
import { formatCurrency as fmt } from '@/lib/utils'
import { staggerContainer, fadeUpItem } from '@/lib/motion'

export function UsersPage() {
  const [users, setUsers] = useState<UserRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [debouncedQ, setDebouncedQ] = useState('')
  const [detailId, setDetailId] = useState<number | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detail, setDetail] = useState<Awaited<ReturnType<typeof api.getUser>>['data'] | null>(null)

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(search.trim()), 300)
    return () => clearTimeout(t)
  }, [search])

  const loadUsers = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data } = await api.getUsers({ q: debouncedQ || undefined, limit: 100 })
      setUsers(data.items)
    } catch {
      setError('Foydalanuvchilarni yuklab bo\'lmadi')
      setUsers([])
    } finally {
      setLoading(false)
    }
  }, [debouncedQ])

  useEffect(() => {
    loadUsers()
  }, [loadUsers])

  async function openDetail(id: number) {
    setDetailId(id)
    setDetailLoading(true)
    setDetail(null)
    try {
      const { data } = await api.getUser(id)
      setDetail(data)
    } catch {
      setDetail(null)
    } finally {
      setDetailLoading(false)
    }
  }

  async function toggleBlock(user: UserRow) {
    const next = !user.is_blocked
    setUsers((list) =>
      list.map((u) => (u.id === user.id ? { ...u, is_blocked: next } : u)),
    )
    try {
      await api.patchUser(user.id, { is_blocked: next })
    } catch {
      setUsers((list) =>
        list.map((u) => (u.id === user.id ? { ...u, is_blocked: user.is_blocked } : u)),
      )
      setError('Holat yangilanmadi')
    }
  }

  async function exportCsv() {
    try {
      const { data } = await api.exportUsersCsv()
      downloadBlob(data as Blob, `foydalanuvchilar_${Date.now()}.csv`)
    } catch {
      setError('Eksport amalga oshmadi')
    }
  }

  return (
    <motion.div variants={staggerContainer} initial="initial" animate="animate">
      <PageHeader
        title="Foydalanuvchilar"
        description="Ro'yxat, qidiruv, bloklash va buyurtmalar tarixi."
        action={
          <div className="flex flex-wrap gap-2">
            <GlassButton type="button" onClick={exportCsv}>
              <ArrowDownTrayIcon className="h-5 w-5" />
              CSV
            </GlassButton>
            <GlassButton type="button" onClick={loadUsers} disabled={loading}>
              <ArrowPathIcon className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
            </GlassButton>
          </div>
        }
      />

      <motion.div variants={fadeUpItem}>
        <GlassPanel className="overflow-hidden !p-0">
          <div className="border-b border-white/10 p-4 dark:border-white/5">
            <SearchField
              value={search}
              onChange={setSearch}
              placeholder="Ism, telefon, username yoki Telegram ID…"
            />
          </div>

          {error && (
            <div className="border-b border-white/10 bg-accent-rose/10 px-6 py-3 text-sm text-rose-600 dark:text-accent-rose">
              {error}
            </div>
          )}

          <PanelState loading={loading} empty={!loading && users.length === 0} emptyIcon={UsersIcon}>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead>
                  <tr className="border-b border-white/20 bg-white/5 text-ink-500 dark:border-white/10">
                    <th className="px-6 py-4 font-semibold">Foydalanuvchi</th>
                    <th className="px-4 py-4 font-semibold">Telegram</th>
                    <th className="px-4 py-4 font-semibold">Telefon</th>
                    <th className="px-4 py-4 font-semibold">Buyurtmalar</th>
                    <th className="px-4 py-4 font-semibold">Bloklangan</th>
                    <th className="px-6 py-4 font-semibold" />
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr
                      key={u.id}
                      className="border-b border-white/10 last:border-0 dark:border-white/5"
                    >
                      <td className="px-6 py-4">
                        <p className="font-medium text-ink-800 dark:text-ink-100">{u.display_name}</p>
                        {u.username && (
                          <p className="text-xs text-ink-500">@{u.username}</p>
                        )}
                      </td>
                      <td className="px-4 py-4 font-mono text-xs text-ink-600">{u.telegram_id}</td>
                      <td className="px-4 py-4 text-ink-600">{u.phone ?? '—'}</td>
                      <td className="px-4 py-4">{u.orders_count}</td>
                      <td className="px-4 py-4">
                        <IOSSwitch
                          checked={u.is_blocked}
                          onChange={() => toggleBlock(u)}
                          label={u.is_blocked ? 'Ha' : 'Yo\'q'}
                        />
                      </td>
                      <td className="px-6 py-4">
                        <GlassButton type="button" onClick={() => openDetail(u.id)}>
                          <EyeIcon className="h-4 w-4" />
                          Profil
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

      <GlassModal
        open={detailId !== null}
        onClose={() => setDetailId(null)}
        title="Profil va buyurtmalar"
        maxWidth="lg"
      >
        {detailLoading ? (
          <p className="text-center text-ink-500">Yuklanmoqda…</p>
        ) : detail ? (
          <div className="space-y-6">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
              <p className="text-lg font-semibold text-ink-900 dark:text-white">
                {detail.user.display_name}
              </p>
              <p className="mt-1 text-sm text-ink-500">
                Telegram: {detail.user.telegram_id} · Buyurtmalar: {detail.user.orders_count}
              </p>
              <p className="text-sm text-ink-500">{detail.user.phone ?? 'Telefon kiritilmagan'}</p>
            </div>
            <div>
              <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-brand-600 dark:text-accent-cyan">
                Buyurtmalar tarixi
              </h3>
              {detail.orders.length === 0 ? (
                <p className="text-sm text-ink-500">Buyurtmalar yo&apos;q</p>
              ) : (
                <ul className="space-y-2">
                  {detail.orders.map((o) => (
                    <li
                      key={o.id}
                      className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm"
                    >
                      <span className="font-mono text-brand-600 dark:text-accent-cyan">{o.code}</span>
                      <span>{fmt(o.total)}</span>
                      <span className="text-xs text-ink-500">{o.status}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        ) : (
          <p className="text-ink-500">Ma&apos;lumot yuklanmadi</p>
        )}
      </GlassModal>
    </motion.div>
  )
}
