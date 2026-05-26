import { motion } from 'framer-motion'
import { fadeUpItem } from '@/lib/motion'

interface PageHeaderProps {
  title: string
  description: string
  action?: React.ReactNode
}

export function PageHeader({ title, description, action }: PageHeaderProps) {
  return (
    <motion.div
      variants={fadeUpItem}
      className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"
    >
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-ink-900 dark:text-white sm:text-4xl">
          {title}
        </h1>
        <p className="mt-2 max-w-2xl text-base text-ink-500 dark:text-ink-400">{description}</p>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </motion.div>
  )
}
