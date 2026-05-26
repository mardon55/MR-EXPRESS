export const ORDER_STATUS_OPTIONS = [
  { value: 'confirmed', label: 'Tasdiqlandi' },
  { value: 'processing', label: 'Jarayonda' },
  { value: 'on_the_way', label: "Yo'lda" },
  { value: 'in_uzbekistan', label: "O'zbekistonda" },
  { value: 'delivering', label: 'Yetkazilmoqda' },
  { value: 'delivered', label: 'Yetkazildi' },
] as const

export type OrderStatusValue = (typeof ORDER_STATUS_OPTIONS)[number]['value']

const STATUS_COLORS: Record<OrderStatusValue, string> = {
  confirmed: 'bg-brand-500/20 text-brand-700 dark:text-brand-400',
  processing: 'bg-accent-amber/20 text-amber-700 dark:text-accent-amber',
  on_the_way: 'bg-accent-cyan/20 text-cyan-700 dark:text-accent-cyan',
  in_uzbekistan: 'bg-accent-violet/20 text-violet-700 dark:text-accent-violet',
  delivering: 'bg-brand-500/20 text-brand-600 dark:text-accent-cyan',
  delivered: 'bg-accent-emerald/20 text-emerald-700 dark:text-accent-emerald',
}

export function orderStatusLabel(value: string): string {
  return ORDER_STATUS_OPTIONS.find((o) => o.value === value)?.label ?? value
}

export function orderStatusColor(value: string): string {
  return STATUS_COLORS[value as OrderStatusValue] ?? 'bg-white/10 text-ink-600'
}
