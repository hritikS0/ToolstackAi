import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '@/store/auth'
import { useToast } from '@/components/ui/toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { config } from '@/config'
import { Eye, EyeOff, AlertCircle, X } from 'lucide-react'
import { cn } from '@/lib/utils'

export function RegisterPage() {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState('')
  const { register, isLoading } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password.length < 6) {
      const msg = 'Password must be at least 6 characters long'
      setError(msg)
      toast.error(msg, 'Validation Error')
      return
    }

    try {
      const welcomeId = await register(email, password, fullName)
      toast.success('Account created successfully!', 'Welcome to ToolStackAI')
      if (welcomeId) {
        navigate(`/chat/${welcomeId}`)
      } else {
        navigate(config.auth.dashboardPath)
      }
    } catch (err: any) {
      const errMsg = err.response?.data?.message || err.message || 'Registration failed. Please try again.'
      setError(errMsg)
      toast.error(errMsg, 'Registration Failed')
    }
  }

  const handleFieldChange = (setter: (v: string) => void) => (val: string) => {
    setter(val)
    if (error) setError('')
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
        <h1 className="text-xl font-semibold mb-1 font-mono text-neutral-200">create account</h1>
        <p className="text-sm text-neutral-400 mb-6 font-mono">
          Already have one? <Link to="/login" className="text-amber-500 hover:underline">sign in</Link>
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-[4px] bg-red-950/50 border border-red-500/40 p-3 text-sm text-red-200 font-mono shadow-lg animate-fade-in flex items-start gap-2.5">
              <AlertCircle className="size-4 text-red-400 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-red-400 text-xs uppercase tracking-wider mb-0.5">Registration Error</div>
                <div className="text-xs text-red-300 leading-relaxed">{error}</div>
              </div>
              <button
                type="button"
                onClick={() => setError('')}
                className="text-red-400 hover:text-red-200 shrink-0 p-0.5"
                title="Dismiss"
              >
                <X className="size-3.5" />
              </button>
            </div>
          )}

          <div>
            <label className="text-xs font-medium text-neutral-400 mb-1.5 block font-mono uppercase tracking-wider">
              Full name
            </label>
            <Input
              placeholder="John Doe"
              value={fullName}
              onChange={e => handleFieldChange(setFullName)(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="text-xs font-medium text-neutral-400 mb-1.5 block font-mono uppercase tracking-wider">
              Email
            </label>
            <Input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={e => handleFieldChange(setEmail)(e.target.value)}
              required
              className={cn(error && 'border-red-500/60 focus:border-red-500')}
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-medium text-neutral-400 block font-mono uppercase tracking-wider">
                Password
              </label>
              <span className="text-[10px] text-neutral-500 font-mono">Min 6 chars</span>
            </div>
            <div className="relative">
              <Input
                type={showPw ? 'text' : 'password'}
                placeholder="Choose a strong password"
                value={password}
                onChange={e => handleFieldChange(setPassword)(e.target.value)}
                required
                minLength={6}
                className={cn(error && 'border-red-500/60 focus:border-red-500')}
              />
              <button
                type="button"
                onClick={() => setShowPw(!showPw)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-200"
                tabIndex={-1}
              >
                {showPw ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>

          <Button type="submit" className="w-full mt-2" variant="primary" size="md" loading={isLoading}>
            Create account
          </Button>
        </form>
      </div>
    </div>
  )
}
