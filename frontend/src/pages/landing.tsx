import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/store/auth'
import { useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { config } from '@/config'
import { MessageSquare, FileText, Image, Bug, ArrowRight, Terminal } from 'lucide-react'
import { motion, useReducedMotion } from 'framer-motion'
import { BackgroundEffects } from '@/components/landing/BackgroundEffects'
import { FadeInWhenVisible } from '@/components/landing/FadeInWhenVisible'
import Typed from 'typed.js'

const features = [
  { icon: MessageSquare, label: 'AI Chat', desc: 'Context-aware conversations with your codebase' },
  { icon: FileText, label: 'PDF Analysis', desc: 'Upload and chat with documents' },
  { icon: Image, label: 'Image Analysis', desc: 'Computer vision for your images' },
  { icon: Bug, label: 'Code Debugger', desc: 'Find and fix bugs instantly' },
]

export function LandingPage() {
  const navigate = useNavigate()
  const { isAuthenticated } = useAuth()
  const shouldReduceMotion = useReducedMotion()
  const el = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    if (isAuthenticated) navigate(config.auth.dashboardPath, { replace: true })
  }, [isAuthenticated, navigate])

  useEffect(() => {
    if (shouldReduceMotion) return
    if (!el.current) return

    const typed = new Typed(el.current, {
      strings: [
        'development workstation',
        'code debugger',
        'document analyzer',
        'image assistant',
      ],
      typeSpeed: 60,
      backSpeed: 30,
      backDelay: 2000,
      loop: true,
      showCursor: true,
      cursorChar: '▋',
    })

    return () => {
      typed.destroy()
    }
  }, [shouldReduceMotion])

  const heroAnimation = (delay: number) => ({
    initial: shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0 },
    transition: {
      duration: shouldReduceMotion ? 0.01 : 0.45,
      delay: shouldReduceMotion ? 0 : delay,
      ease: [0.215, 0.610, 0.355, 1.000],
    }
  })


  return (
    <div className="h-screen w-full overflow-y-auto bg-neutral-950 text-neutral-200 font-mono relative scroll-smooth">
      <BackgroundEffects />

      <nav className="sticky top-0 z-50 h-11 border-b border-neutral-800 bg-neutral-950/80 backdrop-blur-md flex items-center px-4">
        <div className="flex items-center gap-2">
          <div className="size-5 rounded-[4px] bg-amber-500 flex items-center justify-center">
            <span className="text-neutral-950 font-bold text-xs">T</span>
          </div>
          <span className="text-sm font-medium">ToolStackAI</span>
        </div>
        <div className="flex-1" />
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigate(config.auth.loginPath)}>sign in</Button>
          <Button variant="primary" size="sm" onClick={() => navigate('/register')}>get started</Button>
        </div>
      </nav>

      <style>{`
        .typed-cursor {
          color: #f59e0b;
          margin-left: 2px;
          opacity: 0.9;
        }
      `}</style>

      <section className="relative pt-24 pb-16 px-4 max-w-3xl mx-auto text-center z-10 flex flex-col items-center">
        <motion.div 
          {...heroAnimation(0.05)}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[4px] border border-neutral-800 bg-neutral-900/50 backdrop-blur-sm text-xs text-neutral-400 mb-5"
        >
          <Terminal className="size-3.5 text-amber-500/80" />
          developer operating system
        </motion.div>
        
        <motion.h1 
          {...heroAnimation(0.20)}
          className="text-4xl sm:text-5xl font-bold tracking-tight mb-4 leading-tight min-h-[5.5rem] sm:min-h-[6.5rem]"
        >
          Your AI-powered<br />
          <span ref={el} className="text-amber-500">
            {shouldReduceMotion ? 'development workstation' : ''}
          </span>
        </motion.h1>

        
        <motion.p 
          {...heroAnimation(0.35)}
          className="text-base text-neutral-400 max-w-xl mx-auto mb-7 leading-relaxed"
        >
          Chat with AI, analyze images, debug code, and extract insights from documents — all in a single, streamlined interface built for daily use.
        </motion.p>
        
        <motion.div 
          {...heroAnimation(0.50)}
          className="flex items-center justify-center gap-2"
        >
          <Button variant="primary" size="md" onClick={() => navigate('/register')}>
            Get started <ArrowRight className="size-4" />
          </Button>
          <Button variant="secondary" size="md" onClick={() => navigate(config.auth.loginPath)}>
            Sign in
          </Button>
        </motion.div>
      </section>

      <FadeInWhenVisible delay={0.05} duration={0.45}>
        <section className="relative border-t border-neutral-800 py-16 px-4 z-10">
          <div className="max-w-3xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {features.map((f) => (
              <div 
                key={f.label} 
                className="p-4 rounded-[4px] border border-neutral-800 bg-neutral-900/40 backdrop-blur-sm hover:border-amber-500/40 hover:-translate-y-0.5 hover:shadow-[0_0_24px_rgba(245,158,11,0.06)] transition-all duration-300 ease-out relative group overflow-hidden"
              >
                <f.icon className="size-5 text-neutral-400 group-hover:text-amber-500 transition-colors duration-300 mb-2" />
                <h3 className="text-sm font-medium mb-1 group-hover:text-neutral-100 transition-colors duration-300">{f.label}</h3>
                <p className="text-sm text-neutral-400 leading-relaxed group-hover:text-neutral-300 transition-colors duration-300">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>
      </FadeInWhenVisible>

      <FadeInWhenVisible delay={0.05} duration={0.45}>
        <section className="relative border-t border-neutral-800 py-16 px-4 z-10">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-xl font-semibold mb-1">Built for engineers</h2>
            <p className="text-base text-neutral-400 mb-8">Keyboard-first, minimal UI, fast workflows</p>
            <div className="grid grid-cols-3 gap-4 text-center">
              {[
                { value: '99.9%', label: 'Uptime' },
                { value: '<100ms', label: 'Avg Response' },
                { value: '4.9/5', label: 'Developer Rating' },
              ].map(s => (
                <div key={s.label} className="p-4 rounded-[4px] bg-neutral-900/20 border border-neutral-900/40 backdrop-blur-[2px]">
                  <div className="text-2xl font-semibold text-amber-500 mb-1">{s.value}</div>
                  <div className="text-sm text-neutral-500">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </FadeInWhenVisible>

      <FadeInWhenVisible delay={0.05} duration={0.45}>
        <section className="relative border-t border-neutral-800 py-16 px-4 z-10">
          <div className="max-w-xl mx-auto text-center">
            <h2 className="text-xl font-semibold mb-2">Ready to get started?</h2>
            <p className="text-base text-neutral-400 mb-5">Join developers using ToolStackAI daily.</p>
            <Button variant="primary" size="md" onClick={() => navigate('/register')}>
              Get started free <ArrowRight className="size-4" />
            </Button>
          </div>
        </section>
      </FadeInWhenVisible>

      <footer className="relative border-t border-neutral-800 h-11 flex items-center px-4 text-sm text-neutral-500 z-10 bg-neutral-950">
        <span>&copy; 2026 ToolStackAI</span>
        <div className="flex-1" />
        <span>built for developers</span>
      </footer>
    </div>
  )
}

