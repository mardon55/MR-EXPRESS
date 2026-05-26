import { useState } from 'react'
import { cn } from '@/lib/utils'
import {
  ORDER_STATUS_OPTIONS,
  orderStatusColor,
  type OrderStatusValue,
} from '@/constants/orderStatus'

interface OrderStatusSelectProps {
  value: string
  disabled?: boolean
  onChange: (status: OrderStatusValue) => Promise<void>
}

export function OrderStatusSelect({ value, disabled, onChange }: OrderStatusSelectProps) {
  const [saving, setSaving] = useState(false)

  async function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const next = e.target.value as OrderStatusValue
    if (next === value) return
    setSaving(true)
    try {
      await onChange(next)
    } finally {
      setSaving(false)
    }
  }

  return (
    <select
      value={value}
      disabled={disabled || saving}
      onChange={handleChange}
      className={cn(
        'frosted-pill w-full min-w-[10rem] cursor-pointer px-3 py-2 text-xs font-semibold outline-none transition-opacity',
        orderStatusColor(value),
        saving && 'opacity-60',
      )}
      aria-label="Buyurtma statusi"
    >
      {ORDER_STATUS_OPTIONS.map((opt) => (
        <option key={opt.value} value={opt.value} className="bg-ink-900 text-white">
          {opt.label}
        </option>
      ))}
    </select>
  )
}
