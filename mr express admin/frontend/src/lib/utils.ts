import { clsx, type ClassValue } from 'clsx'

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs)
}

export function formatCurrency(amount: number, locale = 'uz-UZ') {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'UZS',
    maximumFractionDigits: 0,
  }).format(amount)
}

export function formatNumber(value: number, locale = 'uz-UZ') {
  return new Intl.NumberFormat(locale).format(value)
}
