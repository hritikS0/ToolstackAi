import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/store/auth'
import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { config } from '@/config'
import { MessageSquare, FileText, Image, Bug, ArrowRight, Terminal } from 'lucide-react'

const features = [
  { icon: MessageSquare, label: 'AI Chat', desc: 'Context-aware conversations with your codebase' },
  { icon: FileText, label: 'PDF Analysis', desc: 'Upload and chat with documents' },
  { icon: Image, label: 'Image Analysis', desc: 'Computer vision for your images' },
  { icon: Bug, label: 'Code Debugger', desc: 'Find and fix bugs instantly' },
]

export function LandingPage() {
  const navigate = useNavigate()
  const { isAuthenticated } = useAuth()

  useEffect(() => {
    if (isAuthenticated) navigate(config.auth.dashboardPath, { replace: true })
  }, [isAuthenticated, navigate])

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-200 font-mono">
      <nav className="h-11 border-b border-neutral-800 bg-neutral-900 flex items-center px-4">
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

      <section className="pt-20 pb-12 px-4 max-w-3xl mx-auto text-center">
        <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-[4px] border border-neutral-800 text-xs text-neutral-400 mb-4">
          <Terminal className="size-3.5" />
          developer operating system
        </div>
        <h1 className="text-4xl font-bold tracking-tight mb-3 leading-tight">
          Your AI-powered<br />
          <span className="text-amber-500">development workstation</span>
        </h1>
        <p className="text-base text-neutral-400 max-w-xl mx-auto mb-6 leading-relaxed">
          Chat with AI, analyze images, debug code, and extract insights from documents — all in a single, streamlined interface built for daily use.
        </p>
        <div className="flex items-center justify-center gap-2">
          <Button variant="primary" size="md" onClick={() => navigate('/register')}>
            Get started <ArrowRight className="size-4" />
          </Button>
          <Button variant="secondary" size="md" onClick={() => navigate(config.auth.loginPath)}>
            Sign in
          </Button>
        </div>
      </section>

      <section className="border-t border-neutral-800 py-12 px-4">
        <div className="max-w-3xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {features.map(f => (
            <div key={f.label} className="p-4 rounded-[4px] border border-neutral-800 bg-neutral-900 hover:border-neutral-700 transition-colors">
              <f.icon className="size-5 text-neutral-400 mb-2" />
              <h3 className="text-sm font-medium mb-1">{f.label}</h3>
              <p className="text-sm text-neutral-400 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-t border-neutral-800 py-12 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-xl font-semibold mb-1">Built for engineers</h2>
          <p className="text-base text-neutral-400 mb-6">Keyboard-first, minimal UI, fast workflows</p>
          <div className="grid grid-cols-3 gap-4 text-center">
            {[
              { value: '99.9%', label: 'Uptime' },
              { value: '<100ms', label: 'Avg Response' },
              { value: '4.9/5', label: 'Developer Rating' },
            ].map(s => (
              <div key={s.label} className="p-4">
                <div className="text-2xl font-semibold text-amber-500 mb-1">{s.value}</div>
                <div className="text-sm text-neutral-500">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-neutral-800 py-14 px-4">
        <div className="max-w-xl mx-auto text-center">
          <h2 className="text-xl font-semibold mb-1">Ready to get started?</h2>
          <p className="text-base text-neutral-400 mb-4">Join developers using ToolStackAI daily.</p>
          <Button variant="primary" size="md" onClick={() => navigate('/register')}>
            Get started free <ArrowRight className="size-4" />
          </Button>
        </div>
      </section>

      <footer className="border-t border-neutral-800 h-10 flex items-center px-4 text-sm text-neutral-500">
        <span>&copy; 2026 ToolStackAI</span>
        <div className="flex-1" />
        <span>built for developers</span>
      </footer>
    </div>
  )
}
