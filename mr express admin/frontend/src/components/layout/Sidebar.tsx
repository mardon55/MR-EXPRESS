import { motion } from 'framer-motion'
import { NavLink } from 'react-router-dom'
import { TruckIcon } from '@heroicons/react/24/solid'
import { NAVIGATION } from '@/constants/navigation'
import { sidebarItemVariants, sidebarVariants } from '@/lib/motion'
import { cn } from '@/lib/utils'

export function Sidebar() {
  return (
    <motion.aside
      className="frosted-glass-heavy fixed inset-y-0 left-0 z-50 flex w-[var(--sidebar-width)] flex-col border-r border-white/10 p-5"
      variants={sidebarVariants}
      initial="hidden"
      animate="visible"
    >
      <motion.div variants={sidebarItemVariants} className="mb-10 px-2 pt-2">
        <div className="flex items-center gap-4">
          <div className="relative flex h-14 w-14 items-center justify-center rounded-3xl bg-gradient-to-br from-brand-500 via-brand-600 to-accent-cyan shadow-glow">
            <TruckIcon className="h-8 w-8 text-white" />
            <div className="absolute inset-0 rounded-3xl ring-1 ring-inset ring-white/30" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-ink-900 dark:text-white">
              MR Express
            </h1>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600 dark:text-accent-cyan">
              Admin
            </p>
          </div>
        </div>
      </motion.div>

      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto overflow-x-hidden pr-1 scrollbar-thin">
        {NAVIGATION.map((item) => (
          <motion.div key={item.id} variants={sidebarItemVariants}>
            <NavLink
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) =>
                cn('nav-link', isActive && 'nav-link-active')
              }
            >
              {({ isActive }) => {
                const Icon = isActive ? item.iconActive : item.icon
                return (
                  <>
                    <span
                      className={cn(
                        'flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl transition-all duration-500',
                        isActive
                          ? 'bg-brand-500/25 text-brand-600 dark:bg-white/10 dark:text-accent-cyan'
                          : 'bg-white/10 text-ink-500 dark:bg-white/5 dark:text-ink-400',
                      )}
                    >
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className="truncate leading-snug">{item.label}</span>
                  </>
                )
              }}
            </NavLink>
          </motion.div>
        ))}
      </nav>

      <motion.div
        variants={sidebarItemVariants}
        className="mt-4 rounded-3xl border border-white/15 bg-gradient-to-br from-brand-600/20 to-accent-cyan/10 p-4 backdrop-blur-ios"
      >
        <p className="text-xs font-bold uppercase tracking-wider text-brand-600 dark:text-accent-cyan">
          Professional Edition
        </p>
        <p className="mt-1.5 text-xs leading-relaxed text-ink-500 dark:text-ink-400">
          iOS Glassmorphism · Suyuq animatsiyalar
        </p>
      </motion.div>
    </motion.aside>
  )
}
