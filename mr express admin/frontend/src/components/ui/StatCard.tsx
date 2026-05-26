import { motion } from 'framer-motion'
import type { ComponentType, SVGProps } from 'react'
import { ArrowTrendingUpIcon, ArrowTrendingDownIcon } from '@heroicons/react/24/solid'
import { GlassPanel } from './GlassPanel'
import { cn } from '@/lib/utils'
import { fadeUpItem } from '@/lib/motion'

interface StatCardProps {
  label: string
  value: string
  delta?: number
  icon: ComponentType<SVGProps<SVGSVGElement>>
  gradient: string
}

export function StatCard({ label, value, delta, icon: Icon, gradient }: StatCardProps) {
  const up = delta !== undefined && delta >= 0

  return (
    <motion.div variants={fadeUpItem}>
      <GlassPanel className="group relative overflow-hidden">
        <div
          className={cn(
            'pointer-events-none absolute -right-8 -top-8 h-36 w-36 rounded-full opacity-50 blur-3xl transition-opacity duration-700 group-hover:opacity-80',
            gradient,
          )}
        />
        <div className="relative flex flex-col gap-5">
          <div className="flex items-start justify-between">
            <div
              className={cn(
                'flex h-14 w-14 items-center justify-center rounded-3xl bg-gradient-to-br shadow-frost',
                gradient,
              )}
            >
              <Icon className="h-7 w-7 text-white" />
            </div>
            {delta !== undefined && (
              <span
                className={cn(
                  'flex items-center gap-1 rounded-2xl px-3 py-1.5 text-xs font-semibold backdrop-blur-ios',
                  up
                    ? 'bg-accent-emerald/20 text-emerald-600 dark:text-accent-emerald'
                    : 'bg-accent-rose/20 text-rose-600 dark:text-accent-rose',
                )}
              >
                {up ? (
                  <ArrowTrendingUpIcon className="h-3.5 w-3.5" />
                ) : (
                  <ArrowTrendingDownIcon className="h-3.5 w-3.5" />
                )}
                {up ? '+' : ''}
                {delta}%
              </span>
            )}
          </div>
          <div>
            <p className="text-sm font-medium text-ink-500 dark:text-ink-400">{label}</p>
            <p className="mt-1.5 text-3xl font-bold tracking-tight text-ink-900 dark:text-white">
              {value}
            </p>
          </div>
        </div>
      </GlassPanel>
    </motion.div>
  )
}
