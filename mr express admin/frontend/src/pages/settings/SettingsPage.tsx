import { useEffect, useState } from 'react'
import { CreditCardIcon } from '@heroicons/react/24/outline'
import { motion } from 'framer-motion'

const API = '/api/v1/settings/payment'

function formatCardDisplay(num: string) {
  const digits = num.replace(/\D/g, '')
  return digits.replace(/(.{4})/g, '$1 ').trim()
}

export function SettingsPage() {
  const [cardNumber, setCardNumber] = useState('')
  const [cardHolder, setCardHolder] = useState('')
  const [bankName, setBankName] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    fetch(API)
      .then((r) => r.json())
      .then((d) => {
        setCardNumber(d.card_number || '')
        setCardHolder(d.card_holder || '')
        setBankName(d.bank_name || '')
      })
      .finally(() => setLoading(false))
  }, [])

  const handleSave = async () => {
    setSaving(true)
    setSaved(false)
    await fetch(API, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        card_number: cardNumber.replace(/\s/g, ''),
        card_holder: cardHolder,
        bank_name: bankName,
      }),
    })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  const displayNum = formatCardDisplay(cardNumber) || '•••• •••• •••• ••••'
  const lastFour = cardNumber.replace(/\D/g, '').slice(-4)

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto max-w-xl space-y-6 p-6"
    >
      <div>
        <h1 className="text-2xl font-bold text-ink-900 dark:text-white">Sozlamalar</h1>
        <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">To'lov kartasi ma'lumotlari</p>
      </div>

      {/* Virtual karta preview */}
      <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f3460] p-6 shadow-2xl">
        <div className="mb-6 flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-widest text-white/50">
            {bankName || 'Bank nomi'}
          </span>
          <CreditCardIcon className="h-8 w-8 text-white/60" />
        </div>
        <p className="mb-6 font-mono text-xl font-semibold tracking-[0.18em] text-white">
          {displayNum}
        </p>
        <div className="flex items-end justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-white/40">Karta egasi</p>
            <p className="text-sm font-bold uppercase tracking-wide text-white">
              {cardHolder || 'FULL NAME'}
            </p>
          </div>
          {lastFour && (
            <div className="rounded-lg bg-white/10 px-3 py-1">
              <span className="font-mono text-xs font-semibold text-white/80">•••• {lastFour}</span>
            </div>
          )}
        </div>
      </div>

      {/* Form */}
      <div className="frosted-glass rounded-3xl p-6 space-y-4">
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-ink-500 dark:text-ink-400">
            Karta raqami
          </label>
          <input
            type="text"
            value={formatCardDisplay(cardNumber)}
            onChange={(e) => setCardNumber(e.target.value.replace(/\D/g, '').slice(0, 16))}
            placeholder="0000 0000 0000 0000"
            className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 font-mono text-[15px] tracking-wider text-ink-900 outline-none placeholder:text-ink-400 focus:ring-2 focus:ring-brand-500/30 dark:text-white"
            maxLength={19}
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-ink-500 dark:text-ink-400">
            Karta egasining ismi
          </label>
          <input
            type="text"
            value={cardHolder}
            onChange={(e) => setCardHolder(e.target.value.toUpperCase())}
            placeholder="FULL NAME"
            className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 font-mono text-[15px] uppercase tracking-wider text-ink-900 outline-none placeholder:text-ink-400 focus:ring-2 focus:ring-brand-500/30 dark:text-white"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-ink-500 dark:text-ink-400">
            Bank nomi
          </label>
          <input
            type="text"
            value={bankName}
            onChange={(e) => setBankName(e.target.value)}
            placeholder="Masalan: Kapitalbank"
            className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-[15px] text-ink-900 outline-none placeholder:text-ink-400 focus:ring-2 focus:ring-brand-500/30 dark:text-white"
          />
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full rounded-xl bg-brand-500 py-3.5 text-[15px] font-semibold text-white shadow-lg transition hover:bg-brand-600 disabled:opacity-60"
        >
          {saving ? 'Saqlanmoqda...' : saved ? '✅ Saqlandi!' : 'Saqlash'}
        </button>
      </div>

      <p className="text-center text-xs text-ink-400 dark:text-ink-500">
        Bu karta ma'lumotlari mijozlarga checkout jarayonida ko'rsatiladi
      </p>
    </motion.div>
  )
}
