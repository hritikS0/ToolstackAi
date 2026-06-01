import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { MotionConfig } from 'framer-motion'
import { useReducedMotion } from 'framer-motion'
import './index.css'
import App from './App.tsx'

function Root() {
  const reduceMotion = useReducedMotion()
  return (
    <StrictMode>
      <MotionConfig reducedMotion={reduceMotion ? 'always' : 'never'}>
        <App />
      </MotionConfig>
    </StrictMode>
  )
}

createRoot(document.getElementById('root')!).render(<Root />)
