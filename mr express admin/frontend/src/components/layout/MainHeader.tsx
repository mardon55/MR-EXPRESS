import { motion } from 'framer-motion'
import { useLocation } from 'react-router-dom'
import { BellIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline'
import { getNavByPath } from '@/constants/navigation'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import { fadeUpItem } from '@/lib/motion'

export function MainHeader() {
  const { pathname } = useLocation()
  const nav = getNavByPath(pathname)

  return (
    <motion.header
      variants={fadeUpItem}
      className="frosted-glass mb-8 flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5"
    >
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600 dark:text-accent-cyan">
          {nav.label}
        </p>
        <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">{nav.description}</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="frosted-pill flex min-w-0 flex-1 items-center gap-2.5 px-4 py-2.5 sm:min-w-[260px] sm:flex-none">
          <MagnifyingGlassIcon className="h-5 w-5 shrink-0 text-ink-400" />
          <input
            type="search"
            placeholder="Qidirish..."
            className="w-full min-w-0 bg-transparent text-sm outline-none placeholder:text-ink-400 dark:text-ink-100"
          />
        </div>
        <motion.button
          type="button"
          className="frosted-button relative !p-3"
          whileTap={{ scale: 0.94 }}
          aria-label="Bildirishnomalar"
        >
          <BellIcon className="h-5 w-5 text-ink-600 dark:text-ink-200" />
          <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-accent-rose ring-2 ring-white/80 dark:ring-ink-950" />
        </motion.button>
        <ThemeToggle />
      </div>
    </motion.header>
  )
}
