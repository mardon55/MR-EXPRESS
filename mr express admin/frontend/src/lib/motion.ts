import type { Transition, Variants } from 'framer-motion'

export const IOS_EASE = [0.22, 1, 0.36, 1] as const

export const iosTransition: Transition = {
  duration: 0.5,
  ease: IOS_EASE,
}

export const pageVariants: Variants = {
  initial: {
    opacity: 0,
    y: 20,
    scale: 0.985,
    filter: 'blur(10px)',
  },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    filter: 'blur(0px)',
    transition: {
      duration: 0.55,
      ease: IOS_EASE,
      when: 'beforeChildren',
      staggerChildren: 0.06,
    },
  },
  exit: {
    opacity: 0,
    y: -12,
    scale: 0.99,
    filter: 'blur(6px)',
    transition: { duration: 0.35, ease: IOS_EASE },
  },
}

export const staggerContainer: Variants = {
  initial: {},
  animate: {
    transition: { staggerChildren: 0.07, delayChildren: 0.05 },
  },
}

export const fadeUpItem: Variants = {
  initial: { opacity: 0, y: 16 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: IOS_EASE },
  },
}

export const sidebarVariants: Variants = {
  hidden: { x: -32, opacity: 0 },
  visible: {
    x: 0,
    opacity: 1,
    transition: { duration: 0.6, ease: IOS_EASE, staggerChildren: 0.045 },
  },
}

export const sidebarItemVariants: Variants = {
  hidden: { x: -16, opacity: 0 },
  visible: { x: 0, opacity: 1, transition: { duration: 0.4, ease: IOS_EASE } },
}
