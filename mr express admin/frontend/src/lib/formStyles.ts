import { cn } from '@/lib/utils'

export const inputClass = cn(
  'frosted-pill w-full px-4 py-3 text-sm font-medium text-ink-800 outline-none',
  'placeholder:text-ink-400 dark:text-ink-100',
)

export const selectClass = cn(inputClass, 'cursor-pointer appearance-none')
