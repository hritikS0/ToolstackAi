import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/store/auth'
import { useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { config } from '@/config'
import {
  MessageSquare, BrainCircuit, Palette, CheckSquare, FileText,
  ArrowRight, Terminal, Zap, Sparkles, Shield, Keyboard, Globe,
  FolderOpen, Flame, Image
} from 'lucide-react'
import { motion, useReducedMotion } from 'framer-motion'
import { BackgroundEffects } from '@/components/landing/BackgroundEffects'
import { FadeInWhenVisible } from '@/components/landing/FadeInWhenVisible'
import { StaggerContainer, fadeItemVariants, fadeItemVariantsReduced } from '@/components/landing/StaggerContainer'
import { CountUp } from '@/components/landing/CountUp'
import Typed from 'typed.js'

function BrowserMockup() {
  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="rounded-lg border border-neutral-800 bg-neutral-950/80 backdrop-blur-sm shadow-2xl shadow-black/40 overflow-hidden">
        {/* Chrome */}
        <div className="flex items-center gap-2 h-9 px-3 border-b border-neutral-800 bg-neutral-900/60">
          <div className="flex items-center gap-1.5">
            <div className="size-2.5 rounded-full bg-red-500/80" />
            <div className="size-2.5 rounded-full bg-amber-500/80" />
            <div className="size-2.5 rounded-full bg-emerald-500/80" />
          </div>
          <div className="flex-1 mx-4">
            <div className="h-5 rounded-[3px] bg-neutral-800/80 border border-neutral-700/50 flex items-center px-2">
              <span className="text-[10px] text-neutral-500 font-mono">app.toolstack.ai</span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <div className="size-4 rounded-[2px] border border-neutral-700/50" />
            <div className="size-4 rounded-[2px] border border-neutral-700/50" />
            <div className="size-4 rounded-[2px] border border-neutral-700/50" />
          </div>
        </div>

        {/* Content */}
        <div className="flex h-[320px] sm:h-[380px]">
          {/* Sidebar */}
          <div className="w-12 sm:w-14 border-r border-neutral-800 bg-neutral-950/60 flex flex-col items-center py-2 gap-1 shrink-0">
            {[MessageSquare, FileText, CheckSquare, BrainCircuit, Palette].map((Icon, i) => (
              <div key={i} className={`size-7 rounded-[4px] flex items-center justify-center ${i === 0 ? 'bg-amber-500/10 text-amber-400' : 'text-neutral-600'}`}>
                <Icon className="size-3.5" />
              </div>
            ))}
          </div>

          {/* Chat area */}
          <div className="flex-1 flex flex-col min-w-0">
            {/* Messages */}
            <div className="flex-1 p-3 space-y-3 overflow-hidden">
              <div className="flex items-start gap-2 max-w-[85%]">
                <div className="size-5 rounded-[3px] bg-amber-500/20 flex items-center justify-center shrink-0 mt-0.5">
                  <Sparkles className="size-3 text-amber-400" />
                </div>
                <div className="space-y-1.5">
                  <div className="h-2 w-32 rounded-sm bg-neutral-800 animate-pulse" />
                  <div className="h-2 w-48 rounded-sm bg-neutral-800/70 animate-pulse" />
                  <div className="h-2 w-40 rounded-sm bg-neutral-800/70 animate-pulse" />
                </div>
              </div>
              <div className="flex items-start gap-2 max-w-[85%] ml-auto justify-end">
                <div className="space-y-1.5">
                  <div className="h-2 w-44 rounded-sm bg-amber-500/10" />
                  <div className="h-2 w-36 rounded-sm bg-amber-500/8" />
                </div>
                <div className="size-5 rounded-[3px] bg-neutral-700/30 flex items-center justify-center shrink-0 mt-0.5">
                  <Terminal className="size-3 text-neutral-500" />
                </div>
              </div>
            </div>

            {/* Composer */}
            <div className="border-t border-neutral-800 p-2">
              <div className="h-8 rounded-[4px] bg-neutral-900/60 border border-neutral-800 flex items-center px-2.5">
                <span className="text-[10px] text-neutral-600 font-mono">Type a message...</span>
                <div className="flex-1" />
                <div className="size-4 rounded-[2px] bg-amber-500/20 flex items-center justify-center">
                  <ArrowRight className="size-2.5 text-amber-400" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

const bentoFeatures = [
  {
    icon: MessageSquare,
    label: 'AI Chat',
    desc: 'Streaming conversations with vision support. Real-time responses via SSE with context-aware replies that understand your project.',
    size: 'col-span-1 sm:col-span-2 sm:row-span-2',
    accent: true,
  },
  {
    icon: BrainCircuit,
    label: 'Knowledge Brain',
    desc: 'AI-powered second brain with embedding search. Store and retrieve knowledge, skills, goals, and preferences.',
    size: 'col-span-1',
  },
  {
    icon: FileText,
    label: 'PDF Analysis',
    desc: 'Upload documents for RAG-powered Q&A. Text is chunked, embedded, and semantically searched for precise answers.',
    size: 'col-span-1',
  },
  {
    icon: CheckSquare,
    label: 'Tasks & Habits',
    desc: 'Track tasks with priorities and due dates. Build habit streaks with visual progress tracking and heatmaps.',
    size: 'col-span-1 sm:col-span-2',
  },
  {
    icon: Palette,
    label: 'Theme Engine',
    desc: '12 fully customizable themes with real-time preview. Keyboard shortcut Cmd+Shift+T to switch anytime.',
    size: 'col-span-1',
  },
]

const stats = [
  { value: 12, label: 'Built-in Themes', icon: Palette, suffix: '' },
  { value: 10, label: 'Integrated Tools', icon: Zap, suffix: '+' },
  { value: 6, label: 'AI Providers', icon: Globe, suffix: '' },
  { value: 100, label: 'SSE Streaming', icon: Sparkles, suffix: '%' },
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
        'knowledge base',
        'document analyst',
        'productivity hub',
      ],
      typeSpeed: 50,
      backSpeed: 25,
      backDelay: 2200,
      loop: true,
      showCursor: true,
      cursorChar: '▋',
    })

    return () => { typed.destroy() }
  }, [shouldReduceMotion])

  const fade = (delay: number) => ({
    initial: shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 16 },
    animate: { opacity: 1, y: 0 },
    transition: {
      duration: shouldReduceMotion ? 0.01 : 0.5,
      delay: shouldReduceMotion ? 0 : delay,
      ease: [0.215, 0.610, 0.355, 1.000],
    },
  })

  const itemV = shouldReduceMotion ? fadeItemVariantsReduced : fadeItemVariants

  return (
    <div className="h-screen w-full overflow-y-auto bg-neutral-950 text-neutral-200 font-mono relative scroll-smooth">
      <BackgroundEffects />

      {/* ── Nav ── */}
      <nav className="sticky top-0 z-50 h-11 border-b border-neutral-800/60 bg-neutral-950/70 backdrop-blur-xl flex items-center px-4">
        <div className="flex items-center gap-2">
          <div className="size-5 rounded-[4px] bg-amber-500 flex items-center justify-center">
            <span className="text-neutral-950 font-bold text-[10px]">T</span>
          </div>
          <span className="text-sm font-medium tracking-tight">ToolStackAI</span>
        </div>
        <div className="flex-1" />
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigate(config.auth.loginPath)}>sign in</Button>
          <Button variant="primary" size="sm" onClick={() => navigate('/register')}>get started</Button>
        </div>
      </nav>

      <style>{`
        .typed-cursor { color: #f59e0b; margin-left: 2px; opacity: 0.9; }
        @media (prefers-reduced-motion: no-preference) {
          .hero-grid { animation: gridPulse 10s ease-in-out infinite alternate; }
          @keyframes gridPulse { 0% { opacity: 0.02; } 100% { opacity: 0.05; } }
        }
      `}</style>

      {/* ── Hero ── */}
      <section className="relative pt-20 sm:pt-28 pb-12 sm:pb-20 px-4 max-w-4xl mx-auto text-center z-10 flex flex-col items-center">
        <motion.div
          {...fade(0.05)}
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md border border-neutral-800 bg-neutral-900/60 backdrop-blur-sm text-xs text-neutral-400 mb-6"
        >
          <Terminal className="size-3 text-amber-500/70" />
          <span className="text-amber-500/70 mr-1">~</span>
          developer operating system
          <span className="inline-block w-1.5 h-3.5 bg-amber-500/40 ml-1 animate-pulse rounded-sm" />
        </motion.div>

        <motion.h1
          {...fade(0.15)}
          className="text-[2.25rem] sm:text-5xl lg:text-[3.5rem] font-bold tracking-tight mb-4 leading-[1.1] min-h-[7rem] sm:min-h-[8.5rem]"
        >
          Your AI-powered<br />
          <span ref={el} className="text-amber-500">
            {shouldReduceMotion ? 'development workstation' : ''}
          </span>
        </motion.h1>

        <motion.p
          {...fade(0.30)}
          className="text-base sm:text-lg text-neutral-400 max-w-xl mx-auto mb-8 leading-relaxed"
        >
          Chat with AI, analyze documents with RAG, manage tasks, build a knowledge base — all in one streamlined workspace built for developers.
        </motion.p>

        <motion.div
          {...fade(0.45)}
          className="flex items-center justify-center gap-3"
        >
          <Button
            variant="primary"
            size="md"
            onClick={() => navigate('/register')}
            className="relative group"
          >
            <span className="relative z-10 flex items-center gap-1.5">
              Get started free
              <ArrowRight className="size-4 group-hover:translate-x-0.5 transition-transform" />
            </span>
          </Button>
          <Button variant="secondary" size="md" onClick={() => navigate(config.auth.loginPath)}>
            Sign in
          </Button>
        </motion.div>

        <motion.p
          {...fade(0.55)}
          className="text-xs text-neutral-600 mt-4"
        >
          No credit card required · Open source
        </motion.p>
      </section>

      {/* ── Product Screenshot ── */}
      <FadeInWhenVisible delay={0.1} duration={0.5} yOffset={20}>
        <section className="relative py-8 sm:py-12 px-4 z-10">
          <BrowserMockup />
        </section>
      </FadeInWhenVisible>

      {/* ── Bento Features ── */}
      <FadeInWhenVisible delay={0.05} duration={0.5}>
        <section className="relative border-t border-neutral-800 py-16 sm:py-20 px-4 z-10">
          <div className="max-w-4xl mx-auto text-center mb-10">
            <h2 className="text-xl sm:text-2xl font-semibold mb-2">Everything you need</h2>
            <p className="text-sm sm:text-base text-neutral-400 max-w-lg mx-auto">
              A complete toolstack engineered for developers, researchers, and builders.
            </p>
          </div>

          <StaggerContainer className="max-w-4xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-3 auto-rows-[minmax(120px,auto)]" staggerDelay={0.06}>
            {bentoFeatures.map((f) => (
              <motion.div
                key={f.label}
                variants={itemV}
                className={`${f.size} p-5 rounded-lg border transition-all duration-200 group cursor-default overflow-hidden relative ${
                  f.accent
                    ? 'border-neutral-800 bg-neutral-900/30 hover:border-amber-500/30 hover:bg-neutral-900/50'
                    : 'border-neutral-800/70 bg-neutral-900/10 hover:border-neutral-700 hover:bg-neutral-900/20'
                }`}
              >
                {f.accent && (
                  <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/3 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:bg-amber-500/5 transition-colors duration-300" />
                )}
                <div className="relative z-10">
                  <div className={`size-8 rounded-md flex items-center justify-center mb-3 transition-all duration-200 group-hover:scale-105 ${
                    f.accent ? 'bg-amber-500/10 text-amber-400' : 'bg-neutral-800/50 text-neutral-400 group-hover:text-neutral-200'
                  }`}>
                    <f.icon className="size-4" />
                  </div>
                  <h3 className="text-sm font-semibold mb-1.5 group-hover:text-neutral-100 transition-colors duration-200">
                    {f.label}
                  </h3>
                  <p className="text-sm text-neutral-400 leading-relaxed group-hover:text-neutral-300 transition-colors duration-200">
                    {f.desc}
                  </p>
                </div>
              </motion.div>
            ))}
          </StaggerContainer>
        </section>
      </FadeInWhenVisible>

      {/* ── Stats ── */}
      <FadeInWhenVisible delay={0.05} duration={0.5}>
        <section className="relative border-t border-neutral-800 py-16 sm:py-20 px-4 z-10">
          <div className="max-w-4xl mx-auto text-center mb-10">
            <h2 className="text-xl sm:text-2xl font-semibold mb-2">Built for performance</h2>
            <p className="text-sm sm:text-base text-neutral-400">
              Designed from the ground up for speed, customization, and developer experience.
            </p>
          </div>

          <div className="max-w-3xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-3">
            {stats.map((s) => (
              <div
                key={s.label}
                className="p-4 rounded-lg border border-neutral-800/70 bg-neutral-900/20 hover:border-neutral-700 hover:bg-neutral-900/30 transition-all duration-200 text-center group"
              >
                <s.icon className="size-4 text-neutral-600 group-hover:text-amber-500/50 transition-colors duration-200 mx-auto mb-2" />
                <CountUp
                  end={s.value}
                  suffix={s.suffix}
                  className="text-2xl sm:text-3xl font-semibold text-amber-500 mb-1 font-mono tabular-nums"
                  duration={1800}
                />
                <div className="text-xs sm:text-sm text-neutral-500 group-hover:text-neutral-400 transition-colors duration-200">
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        </section>
      </FadeInWhenVisible>

      {/* ── Why Section ── */}
      <FadeInWhenVisible delay={0.05} duration={0.5}>
        <section className="relative border-t border-neutral-800 py-16 sm:py-20 px-4 z-10">
          <div className="max-w-4xl mx-auto text-center mb-10">
            <h2 className="text-xl sm:text-2xl font-semibold mb-2">Why developers choose ToolStackAI</h2>
            <p className="text-sm sm:text-base text-neutral-400">
              Purpose-built for technical workflows, not yet another chat wrapper.
            </p>
          </div>

          <StaggerContainer className="max-w-3xl mx-auto grid grid-cols-1 sm:grid-cols-2 gap-3" staggerDelay={0.06}>
            {[
              { icon: Zap, title: 'Streaming AI', desc: 'Token-by-token streaming via SSE. See responses in real-time as the model thinks — no waiting for full completions.' },
              { icon: Keyboard, title: 'Keyboard-first', desc: 'Cmd+K command palette, Cmd+Shift+T theme switcher, and full navigation shortcuts. Your hands never leave the keys.' },
              { icon: Shield, title: 'Persistent storage', desc: 'All conversations, files, and knowledge stored in your database with JWT-secured access. Your data stays yours.' },
              { icon: Globe, title: 'Multi-provider', desc: 'Connect NVIDIA, OpenAI, Anthropic, DeepSeek, Gemini, or OpenRouter. Switch providers anytime without losing data.' },
              { icon: FolderOpen, title: 'Project organization', desc: 'Group tasks, goals, habits, and notes into projects. Everything connected in one workspace.' },
              { icon: Image, title: 'Vision & media', desc: 'Attach images in chat for multimodal AI conversations. Upload and manage files with cloud storage.' },
            ].map((w) => (
              <motion.div
                key={w.title}
                variants={itemV}
                className="p-4 rounded-lg border border-neutral-800/60 bg-neutral-900/10 hover:border-neutral-700 hover:bg-neutral-900/20 transition-all duration-200 group"
              >
                <div className="flex items-start gap-3">
                  <div className="size-8 rounded-md bg-neutral-800/40 flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-amber-500/10 transition-colors duration-200">
                    <w.icon className="size-4 text-neutral-400 group-hover:text-amber-400/70 transition-colors duration-200" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold mb-1 group-hover:text-neutral-100 transition-colors duration-200">{w.title}</h3>
                    <p className="text-sm text-neutral-400 leading-relaxed group-hover:text-neutral-300 transition-colors duration-200">{w.desc}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </StaggerContainer>
        </section>
      </FadeInWhenVisible>

      {/* ── Final CTA ── */}
      <FadeInWhenVisible delay={0.05} duration={0.5}>
        <section className="relative border-t border-neutral-800 py-20 sm:py-28 px-4 z-10">
          <div className="max-w-lg mx-auto text-center">
            <div className="inline-flex items-center justify-center size-12 rounded-xl bg-amber-500/10 border border-amber-500/20 mb-6">
              <Sparkles className="size-6 text-amber-400" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold mb-3 tracking-tight">
              Ready to build faster?
            </h2>
            <p className="text-base text-neutral-400 mb-3 max-w-md mx-auto leading-relaxed">
              Join developers using ToolStackAI as their AI-powered command center. Free to start, no credit card required.
            </p>
            <p className="text-xs text-neutral-600 mb-6 font-mono">
              Express 5 · React 19 · PostgreSQL · NVIDIA AI · Supabase
            </p>
            <Button
              variant="primary"
              size="md"
              onClick={() => navigate('/register')}
              className="group"
            >
              <span className="relative z-10 flex items-center gap-1.5">
                Get started free
                <ArrowRight className="size-4 group-hover:translate-x-0.5 transition-transform" />
              </span>
            </Button>
          </div>
        </section>
      </FadeInWhenVisible>

      {/* ── Footer ── */}
      <footer className="relative border-t border-neutral-800 h-11 flex items-center px-4 text-xs text-neutral-600 z-10 bg-neutral-950">
        <span>&copy; 2026 ToolStackAI</span>
        <div className="flex-1" />
        <div className="flex items-center gap-3">
          <span className="cursor-default hover:text-neutral-400 transition-colors">docs</span>
          <span className="cursor-default hover:text-neutral-400 transition-colors">github</span>
          <span className="cursor-default hover:text-neutral-400 transition-colors">status</span>
        </div>
      </footer>
    </div>
  )
}
