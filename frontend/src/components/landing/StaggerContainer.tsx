import { motion, useReducedMotion, type Variants } from 'framer-motion'
import { type ReactNode } from 'react'

interface StaggerContainerProps {
  children: ReactNode
  staggerDelay?: number
  className?: string
  once?: boolean
}

export function StaggerContainer({
  children,
  staggerDelay = 0.08,
  className = '',
  once = true,
}: StaggerContainerProps) {
  const shouldReduceMotion = useReducedMotion()

  const containerVariants: Variants = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: shouldReduceMotion ? 0 : staggerDelay,
        delayChildren: 0.05,
      },
    },
  }

  return (
    <motion.div
      className={className}
      variants={containerVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once, margin: '-40px' }}
    >
      {children}
    </motion.div>
  )
}

export const fadeItemVariants: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.45,
      ease: [0.215, 0.610, 0.355, 1.000],
    },
  },
}

export const fadeItemVariantsReduced: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.01 },
  },
}
