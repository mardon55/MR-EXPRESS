import { motion, type HTMLMotionProps } from 'framer-motion'
import { cn } from '@/lib/utils'
import type { ReactNode } from 'react'

interface GlassButtonProps extends HTMLMotionProps<'button'> {
  children: ReactNode
  variant?: 'default' | 'primary'
  className?: string
}

export function GlassButton({
  children,
  variant = 'default',
  className,
  ...props
}: GlassButtonProps) {
  return (
    <motion.button
      type="button"
      className={cn(
        'frosted-button inline-flex items-center justify-center gap-2',
        variant === 'primary' &&
          'border-brand-500/40 bg-brand-500/20 text-white hover:bg-brand-500/30 hover:shadow-glow dark:text-white',
        className,
      )}
      whileTap={{ scale: 0.97 }}
      transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
      {...props}
    >
      {children}
    </motion.button>
  )
}
