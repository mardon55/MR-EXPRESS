import { motion } from 'framer-motion'
import type { ComponentType, SVGProps } from 'react'
import { SparklesIcon } from '@heroicons/react/24/outline'
import { PageHeader } from '@/components/ui/PageHeader'
import { GlassPanel } from '@/components/ui/GlassPanel'
import { GlassButton } from '@/components/ui/GlassButton'
import { staggerContainer, fadeUpItem } from '@/lib/motion'

interface ModulePageProps {
  title: string
  description: string
  icon: ComponentType<SVGProps<SVGSVGElement>>
  features: string[]
}

export function ModulePage({ title, description, icon: Icon, features }: ModulePageProps) {
  return (
    <motion.div variants={staggerContainer} initial="initial" animate="animate">
      <PageHeader
        title={title}
        description={description}
        action={
          <GlassButton variant="primary">
            <SparklesIcon className="h-5 w-5" />
            Yangi qo'shish
          </GlassButton>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <motion.div variants={fadeUpItem} className="lg:col-span-2">
          <GlassPanel className="flex min-h-[320px] flex-col items-center justify-center text-center">
            <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-4xl bg-gradient-to-br from-brand-500/30 to-accent-cyan/20 shadow-glow">
              <Icon className="h-10 w-10 text-brand-600 dark:text-accent-cyan" />
            </div>
            <h2 className="text-xl font-semibold text-ink-900 dark:text-white">{title}</h2>
            <p className="mt-3 max-w-md text-sm text-ink-500 dark:text-ink-400">
              Bu modul keyingi bosqichda to'liq CRUD, filtrlash va API integratsiyasi bilan
              jihozlanadi. Dizayn tizimi tayyor — faqat biznes logika qo'shiladi.
            </p>
          </GlassPanel>
        </motion.div>

        <motion.div variants={fadeUpItem}>
          <GlassPanel>
            <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-brand-600 dark:text-accent-cyan">
              Rejalashtirilgan funksiyalar
            </h3>
            <ul className="space-y-3">
              {features.map((feature) => (
                <li
                  key={feature}
                  className="flex items-start gap-3 rounded-3xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-ink-700 dark:text-ink-200"
                >
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent-cyan" />
                  {feature}
                </li>
              ))}
            </ul>
          </GlassPanel>
        </motion.div>
      </div>
    </motion.div>
  )
}
