import { clsx, type ClassValue } from 'clsx'

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs)
}

export function formatCurrency(amount: number) {
  if (amount === null || amount === undefined) return '—'
  return new Intl.NumberFormat('ru-RU').format(Math.round(amount)) + " so'm"
}

export function formatNumber(value: number, locale = 'uz-UZ') {
  return new Intl.NumberFormat(locale).format(value)
}
