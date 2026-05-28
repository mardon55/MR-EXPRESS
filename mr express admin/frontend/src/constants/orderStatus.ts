export const ORDER_STATUS_OPTIONS = [
  { value: 'pending',   label: 'Yangi' },
  { value: 'confirmed', label: 'Tasdiqlandi' },
  { value: 'active',    label: 'Aktiv' },
  { value: 'arrived',   label: 'Yetib keldi' },
  { value: 'delivered', label: 'Yetkazildi' },
] as const

export type OrderStatusValue = (typeof ORDER_STATUS_OPTIONS)[number]['value']

export const TAB_STATUSES = [
  { key: 'all',       label: 'Barchasi' },
  { key: 'pending',   label: 'Yangi' },
  { key: 'confirmed', label: 'Tasdiqlandi' },
  { key: 'active',    label: 'Aktiv' },
  { key: 'arrived',   label: 'Yetib keldi' },
  { key: 'delivered', label: 'Yetkazildi' },
] as const

export type TabKey = (typeof TAB_STATUSES)[number]['key']

const STATUS_COLORS: Record<OrderStatusValue, string> = {
  pending:   'bg-rose-500/20 text-rose-700 dark:text-rose-400',
  confirmed: 'bg-blue-500/20 text-blue-700 dark:text-blue-400',
  active:    'bg-amber-500/20 text-amber-700 dark:text-amber-400',
  arrived:   'bg-violet-500/20 text-violet-700 dark:text-violet-400',
  delivered: 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-400',
}

export function orderStatusLabel(value: string): string {
  return ORDER_STATUS_OPTIONS.find((o) => o.value === value)?.label ?? value
}

export function orderStatusColor(value: string): string {
  return STATUS_COLORS[value as OrderStatusValue] ?? 'bg-white/10 text-ink-600'
}
