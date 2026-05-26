import { motion } from 'framer-motion'

const orbs = [
  { className: 'left-[-10%] top-[-5%] h-[420px] w-[420px] bg-brand-500/30', duration: 18 },
  { className: 'right-[-5%] top-[15%] h-[360px] w-[360px] bg-accent-violet/25', duration: 22 },
  { className: 'bottom-[-10%] left-[30%] h-[480px] w-[480px] bg-accent-cyan/15', duration: 26 },
]

export function BackgroundOrbs() {
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
      {orbs.map((orb, i) => (
        <motion.div
          key={i}
          className={`absolute rounded-full blur-[100px] ${orb.className}`}
          animate={{
            x: [0, 24, -16, 0],
            y: [0, -20, 12, 0],
            scale: [1, 1.05, 0.98, 1],
          }}
          transition={{
            duration: orb.duration,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      ))}
      <div className="absolute inset-0 bg-[#e8eef8]/40 dark:bg-[#030712]/50" />
    </div>
  )
}
