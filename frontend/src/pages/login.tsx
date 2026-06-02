import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '@/store/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { config } from '@/config'
import { Eye, EyeOff, Terminal } from 'lucide-react'

export function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState('')
  const { login, isLoading } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    try { await login(email, password); navigate(config.auth.dashboardPath) }
    catch { setError('Invalid email or password') }
  }

  return (
    <div className="min-h-screen bg-neutral-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2 mb-6">
          <div className="size-6 rounded-[4px] bg-amber-500 flex items-center justify-center">
            <span className="text-neutral-950 font-bold text-xs font-mono">T</span>
          </div>
          <span className="text-sm font-medium font-mono text-neutral-200">ToolStackAI</span>
        </div>
        <h1 className="text-xl font-semibold mb-1 font-mono text-neutral-200">sign in</h1>
        <p className="text-sm text-neutral-400 mb-6 font-mono">
          Don't have an account? <Link to="/register" className="text-amber-500 hover:underline">create one</Link>
        </p>
        <form onSubmit={handleSubmit} className="space-y-3">
          {error && <div className="rounded-[4px] bg-red-500/10 border border-red-500/20 px-3 py-2 text-sm text-red-400 font-mono">{error}</div>}
          <div><label className="text-sm font-medium text-neutral-400 mb-1 block font-mono uppercase tracking-wider">Email</label><Input type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} required /></div>
          <div>
            <label className="text-sm font-medium text-neutral-400 mb-1 block font-mono uppercase tracking-wider">Password</label>
            <div className="relative">
              <Input type={showPw ? 'text' : 'password'} placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required />
              <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-200">
                {showPw ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>
          <Button type="submit" className="w-full" variant="primary" size="md" loading={isLoading}>Sign in</Button>
        </form>
      </div>
    </div>
  )
}
