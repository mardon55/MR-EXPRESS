import { motion, AnimatePresence } from 'framer-motion'
import { XMarkIcon } from '@heroicons/react/24/outline'
import type { ReactNode } from 'react'

interface GlassModalProps {
  open: boolean
  onClose: () => void
  title: string
  description?: string
  children: ReactNode
  maxWidth?: 'md' | 'lg' | 'xl'
}

const widthClass = {
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-3xl',
}

export function GlassModal({
  open,
  onClose,
  title,
  description,
  children,
  maxWidth = 'lg',
}: GlassModalProps) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <button
            type="button"
            className="absolute inset-0 bg-ink-950/40 backdrop-blur-sm"
            aria-label="Yopish"
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-labelledby="glass-modal-title"
            className={`frosted-glass-heavy relative z-10 max-h-[90vh] w-full ${widthClass[maxWidth]} overflow-y-auto p-6 shadow-frost-lg`}
            initial={{ scale: 0.95, y: 16 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.95, y: 16 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <h2 id="glass-modal-title" className="text-xl font-bold text-ink-900 dark:text-white">
                  {title}
                </h2>
                {description && (
                  <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">{description}</p>
                )}
              </div>
              <button
                type="button"
                onClick={onClose}
                className="frosted-button !rounded-2xl !p-2"
                aria-label="Modalni yopish"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
