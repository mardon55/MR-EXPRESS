import { useEffect, useState } from 'react'
import { CreditCardIcon, TruckIcon } from '@heroicons/react/24/outline'
import { motion } from 'framer-motion'

const API = '/api/v1/settings/payment'
const CARGO_API = '/api/v1/settings/cargo-rate'

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

  const [cargoRate, setCargoRate] = useState('')
  const [cargoSaving, setCargoSaving] = useState(false)
  const [cargoSaved, setCargoSaved] = useState(false)

  useEffect(() => {
    Promise.all([
      fetch(API).then((r) => r.json()),
      fetch(CARGO_API).then((r) => r.json()),
    ]).then(([payment, cargo]) => {
      setCardNumber(payment.card_number || '')
      setCardHolder(payment.card_holder || '')
      setBankName(payment.bank_name || '')
      setCargoRate(String(cargo.rate_per_kg ?? 12000))
    }).finally(() => setLoading(false))
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

  const handleCargoSave = async () => {
    const rate = parseInt(cargoRate.replace(/\D/g, ''), 10)
    if (!rate || rate <= 0) return
    setCargoSaving(true)
    setCargoSaved(false)
    await fetch(CARGO_API, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rate_per_kg: rate }),
    })
    setCargoSaving(false)
    setCargoSaved(true)
    setTimeout(() => setCargoSaved(false), 3000)
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

      {/* Kargo narxi */}
      <div className="frosted-glass rounded-3xl p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-500/10">
            <TruckIcon className="h-5 w-5 text-brand-500" />
          </div>
          <div>
            <h2 className="text-base font-bold text-ink-900 dark:text-white">Kargo narxi</h2>
            <p className="text-xs text-ink-500 dark:text-ink-400">1 kg uchun so'm hisobida</p>
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-ink-500 dark:text-ink-400">
            1 kg narxi (so'm)
          </label>
          <input
            type="number"
            min="1"
            value={cargoRate}
            onChange={(e) => setCargoRate(e.target.value)}
            placeholder="Masalan: 12000"
            className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-[15px] text-ink-900 outline-none placeholder:text-ink-400 focus:ring-2 focus:ring-brand-500/30 dark:text-white"
          />
          {cargoRate && parseInt(cargoRate) > 0 && (
            <p className="mt-1.5 text-xs text-ink-400 dark:text-ink-500">
              Misol: 2.5 kg → {(parseFloat(cargoRate) * 2.5).toLocaleString('uz-UZ')} so'm
            </p>
          )}
        </div>

        <button
          onClick={handleCargoSave}
          disabled={cargoSaving}
          className="w-full rounded-xl bg-brand-500 py-3.5 text-[15px] font-semibold text-white shadow-lg transition hover:bg-brand-600 disabled:opacity-60"
        >
          {cargoSaving ? 'Saqlanmoqda...' : cargoSaved ? '✅ Saqlandi!' : 'Kargo narxini saqlash'}
        </button>
      </div>
    </motion.div>
  )
}
