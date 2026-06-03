import { motion, useReducedMotion } from 'framer-motion'
import { ReactNode } from 'react'

interface FadeInWhenVisibleProps {
  children: ReactNode
  delay?: number
  duration?: number
  yOffset?: number
  className?: string
}

export function FadeInWhenVisible({
  children,
  delay = 0,
  duration = 0.4,
  yOffset = 12,
  className = '',
}: FadeInWhenVisibleProps) {
  const shouldReduceMotion = useReducedMotion()

  return (
    <motion.div
      initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: yOffset }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{
        duration: shouldReduceMotion ? 0.01 : duration,
        delay: shouldReduceMotion ? 0 : delay,
        ease: [0.215, 0.610, 0.355, 1.000], // smooth cubic-bezier curve
      }}
      className={className}
    >
      {children}
    </motion.div>
  )
}
