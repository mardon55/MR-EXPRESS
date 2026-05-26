import { motion } from 'framer-motion'
import { MoonIcon, SunIcon } from '@heroicons/react/24/outline'
import { useTheme } from '@/contexts/ThemeContext'
import { cn } from '@/lib/utils'

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggleTheme } = useTheme()
  const isDark = theme === 'dark'

  return (
    <motion.button
      type="button"
      onClick={toggleTheme}
      className={cn('frosted-button !p-3', className)}
      whileTap={{ scale: 0.94 }}
      aria-label={isDark ? 'Yorug\' rejim' : 'Qorong\'u rejim'}
    >
      <motion.div
        key={theme}
        initial={{ rotate: -120, opacity: 0, scale: 0.6 }}
        animate={{ rotate: 0, opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      >
        {isDark ? (
          <SunIcon className="h-5 w-5 text-accent-amber" />
        ) : (
          <MoonIcon className="h-5 w-5 text-brand-600" />
        )}
      </motion.div>
    </motion.button>
  )
}
