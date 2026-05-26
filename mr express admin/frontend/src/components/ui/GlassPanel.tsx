import { motion, type HTMLMotionProps } from 'framer-motion'
import { cn } from '@/lib/utils'
import type { ReactNode } from 'react'

type GlassVariant = 'default' | 'heavy' | 'pill'

interface GlassPanelProps extends HTMLMotionProps<'div'> {
  children: ReactNode
  variant?: GlassVariant
  className?: string
  noPadding?: boolean
}

const variantClass: Record<GlassVariant, string> = {
  default: 'frosted-glass',
  heavy: 'frosted-glass-heavy',
  pill: 'frosted-pill',
}

export function GlassPanel({
  children,
  variant = 'default',
  className,
  noPadding = false,
  ...props
}: GlassPanelProps) {
  return (
    <motion.div
      className={cn(variantClass[variant], !noPadding && 'p-6', className)}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      {...props}
    >
      {children}
    </motion.div>
  )
}
