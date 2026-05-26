import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface IOSSwitchProps {
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
  label?: string
}

export function IOSSwitch({ checked, onChange, disabled, label }: IOSSwitchProps) {
  return (
    <label
      className={cn(
        'inline-flex cursor-pointer items-center gap-3',
        disabled && 'cursor-not-allowed opacity-50',
      )}
    >
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => !disabled && onChange(!checked)}
        className={cn(
          'relative h-8 w-14 shrink-0 rounded-full border transition-colors',
          checked
            ? 'border-brand-500/50 bg-brand-500/80'
            : 'border-white/20 bg-white/15 dark:bg-white/10',
        )}
      >
        <motion.span
          className="absolute top-1 left-1 h-6 w-6 rounded-full bg-white shadow-md"
          animate={{ x: checked ? 24 : 0 }}
          transition={{ type: 'spring', stiffness: 500, damping: 35 }}
        />
      </button>
      {label && <span className="text-sm font-medium text-ink-700 dark:text-ink-200">{label}</span>}
    </label>
  )
}
