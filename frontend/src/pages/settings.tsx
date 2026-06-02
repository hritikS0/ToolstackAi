import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/store/auth'
import { useTheme, builtinThemes } from '@/store/theme'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { keysService } from '@/services/keys.service'
import apiClient from '@/api/client'
import { config } from '@/config'
import {
  User, Shield, Palette, Activity, LogOut, Save, Moon, Monitor,
  Terminal, Check, Pencil, Calendar, KeyRound, ExternalLink,
  Loader2, X, Plus, Trash2, Wifi,
} from 'lucide-react'
import type { UserApiKey } from '@/types/api'

const providers = [
  { id: 'nvidia', name: 'NVIDIA', desc: 'Chat, vision & embeddings' },
  { id: 'openai', name: 'OpenAI', desc: 'GPT models' },
  { id: 'anthropic', name: 'Anthropic', desc: 'Claude models' },
  { id: 'openrouter', name: 'OpenRouter', desc: 'Multi-model gateway' },
  { id: 'deepseek', name: 'DeepSeek', desc: 'DeepSeek models' },
  { id: 'gemini', name: 'Gemini', desc: 'Google models' },
]

const sections = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'security', label: 'Security', icon: Shield },
  { id: 'api-keys', label: 'API Keys', icon: KeyRound },
  { id: 'theme', label: 'Theme', icon: Palette },
  { id: 'usage', label: 'Usage', icon: Activity },
] as const
type Section = (typeof sections)[number]['id']

export function SettingsPage() {
  const { user, logout, refreshUser } = useAuth()
  const { theme, setTheme, setIsOpen: openThemeModal } = useTheme()
  const queryClient = useQueryClient()
  const [active, setActive] = useState<Section>('profile')
  const [fullName, setFullName] = useState(user?.fullName || '')
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState('')
  const [addProvider, setAddProvider] = useState('')
  const [newKey, setNewKey] = useState('')
  const [testing, setTesting] = useState<string | null>(null)
  const [testResult, setTestResult] = useState<{ providerId: string; success: boolean; message: string } | null>(null)

  const { data: keys = [], isLoading: keysLoading } = useQuery({
    queryKey: ['api-keys'],
    queryFn: async () => (await keysService.getKeys()).data || [],
  })

  const saveMutation = useMutation({
    mutationFn: ({ provider, key }: { provider: string; key: string }) => keysService.saveKey(provider, key),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['api-keys'] }); setAddProvider(''); setNewKey('') },
  })

  const deleteMutation = useMutation({
    mutationFn: (provider: string) => keysService.deleteKey(provider),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['api-keys'] }),
  })

  const handleTest = async (provider: string) => {
    setTesting(provider)
    setTestResult(null)
    try {
      const res = await keysService.testKey(provider)
      if (res.data?.ok) {
        setTestResult({ providerId: provider, success: true, message: 'Connection successful!' })
      } else {
        setTestResult({ providerId: provider, success: false, message: res.data?.message || 'Connection failed' })
      }
      setTimeout(() => setTestResult(null), 4000)
    } catch {
      setTestResult({ providerId: provider, success: false, message: 'Test failed: Network error' })
      setTimeout(() => setTestResult(null), 4000)
    } finally {
      setTesting(null)
    }
  }

  const handleSaveProfile = async () => {
    if (!fullName.trim()) return
    setSaving(true)
    setSaveMsg('')
    try {
      const res = await apiClient.put('/auth/me', { fullName })
      if (res.data.success) {
        const updated = { ...user, fullName: res.data.data.fullName }
        localStorage.setItem(config.auth.userKey, JSON.stringify(updated))
        refreshUser()
        setSaveMsg('Saved')
        setTimeout(() => setSaveMsg(''), 2000)
      }
    } catch {
      setSaveMsg('Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const initials = user?.fullName
    ? user.fullName.split(' ').map(w => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase()
    : 'U'

  const keyMap = new Map<string, UserApiKey>(keys.map(k => [k.provider, k]))

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-4 md:p-6 min-w-0">
        <div className="flex items-center gap-2 mb-4 md:mb-6">
          <Terminal className="size-4 text-base-500" />
          <h1 className="text-sm font-medium text-base-100 font-mono">Settings</h1>
        </div>

        <div className="flex flex-col md:flex-row gap-6">
          <nav className="flex md:flex-col overflow-x-auto md:overflow-x-visible no-scrollbar pb-3 md:pb-0 w-full md:w-60 shrink-0 gap-1 border-b border-base-800 md:border-b-0 md:sticky md:top-0 md:self-start" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            {sections.map(s => (
              <button type="button" key={s.id} onClick={() => setActive(s.id)}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-[4px] text-[12px] transition-colors font-mono shrink-0 whitespace-nowrap ${
                  active === s.id ? 'bg-accent-muted text-accent' : 'text-base-400 hover:text-base-200 hover:bg-base-800'
                }`}>
                <s.icon className="size-4" /> {s.label}
              </button>
            ))}
            <div className="flex items-center md:block md:pt-3 md:mt-3 border-l border-base-800 pl-1 ml-1 md:border-l-0 md:pl-0 md:ml-0 md:border-t border-base-800">
              <button type="button" onClick={logout}
                className="flex items-center gap-2.5 px-3 py-2 rounded-[4px] text-[12px] font-mono text-red-400 hover:bg-base-800 transition-colors shrink-0 whitespace-nowrap">
                <LogOut className="size-4" /> Sign out
              </button>
            </div>
          </nav>

          <div className="flex-1 min-w-0 max-w-4xl space-y-6">
            {active === 'profile' && (
              <>
                <div className="rounded-[4px] border border-base-800 bg-surface overflow-hidden">
                  <div className="px-4 py-3 md:px-5 md:py-4 border-b border-base-800 bg-surface-alt flex items-center gap-3">
                    <div className="size-12 rounded-[4px] bg-accent/20 border border-accent/30 flex items-center justify-center text-base font-medium text-accent font-mono">
                      {initials}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-base-100 font-mono">{user?.fullName}</p>
                      <p className="text-[11px] text-base-500 font-mono">{user?.email}</p>
                    </div>
                  </div>

                  <div className="p-4 md:p-5">
                    <h3 className="text-[10px] font-medium text-base-400 uppercase tracking-wider font-mono mb-3">Personal Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] font-medium text-base-400 mb-1 block font-mono uppercase tracking-wider">Full Name</label>
                        <Input value={fullName} onChange={e => setFullName(e.target.value)} className="h-8 text-[12px] w-full" />
                      </div>
                      <div>
                        <label className="text-[10px] font-medium text-base-400 mb-1 block font-mono uppercase tracking-wider">Email</label>
                        <Input value={user?.email || ''} disabled className="h-8 text-[12px] w-full" />
                      </div>
                    </div>
                  </div>

                  <div className="px-4 pb-4 md:px-5 md:pb-5">
                    <h3 className="text-[10px] font-medium text-base-400 uppercase tracking-wider font-mono mb-3">Account Details</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-base-500 font-mono w-20 shrink-0">Role</span>
                        <span className="text-[11px] text-base-200 font-mono">Developer</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-base-500 font-mono w-20 shrink-0">Joined</span>
                        <span className="text-[11px] text-base-200 font-mono">
                          {user?.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : '—'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="px-4 pb-4 md:px-5 md:pb-5 flex flex-col sm:flex-row sm:items-center gap-2">
                    <Button variant="primary" size="sm" onClick={handleSaveProfile} disabled={saving} className="w-full sm:w-auto justify-center">
                      <Save className="size-3.5" /> {saving ? 'Saving...' : 'Save Changes'}
                    </Button>
                    {saveMsg && (
                      <span className="flex items-center justify-center gap-1 text-[10px] font-mono text-accent">
                        <Check className="size-3" /> {saveMsg}
                      </span>
                    )}
                  </div>
                </div>
              </>
            )}

            {active === 'security' && (
              <div className="rounded-[4px] border border-base-800 bg-surface overflow-hidden">
                <div className="px-4 py-3 md:px-5 md:py-4 border-b border-base-800 bg-surface-alt flex items-center gap-2">
                  <KeyRound className="size-4 text-base-400" />
                  <h2 className="text-[12px] font-medium text-base-200 font-mono">Password</h2>
                </div>
                <div className="p-4 md:p-5 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-medium text-base-400 mb-1 block font-mono uppercase tracking-wider">Current Password</label>
                      <Input type="password" placeholder="Enter current password" className="h-8 text-[12px] w-full" />
                    </div>
                    <div className="hidden md:block" />
                    <div>
                      <label className="text-[10px] font-medium text-base-400 mb-1 block font-mono uppercase tracking-wider">New Password</label>
                      <Input type="password" placeholder="Enter new password" className="h-8 text-[12px] w-full" />
                    </div>
                    <div>
                      <label className="text-[10px] font-medium text-base-400 mb-1 block font-mono uppercase tracking-wider">Confirm Password</label>
                      <Input type="password" placeholder="Confirm new password" className="h-8 text-[12px] w-full" />
                    </div>
                  </div>
                  <Button variant="primary" size="sm" className="w-full md:w-auto justify-center">Update Password</Button>
                </div>
              </div>
            )}

            {active === 'api-keys' && (
              <div className="rounded-[4px] border border-base-800 bg-surface overflow-hidden">
                <div className="px-4 py-3 md:px-5 md:py-4 border-b border-base-800 bg-surface-alt flex items-center gap-2">
                  <KeyRound className="size-4 text-base-400" />
                  <h2 className="text-[12px] font-medium text-base-200 font-mono">API Keys</h2>
                  <span className="text-[10px] text-base-600 font-mono ml-2">Bring your own keys</span>
                </div>
                <div className="p-4 md:p-5 space-y-3">
                  {providers.map(p => {
                    const k = keyMap.get(p.id)
                    return (
                      <div key={p.id} className="rounded-[4px] border border-base-800 bg-base-950 p-4 space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                          <div className="flex items-start gap-2.5 min-w-0">
                            <div className={`size-2 rounded-full mt-1.5 shrink-0 ${k?.isActive ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]' : 'bg-base-600'}`} />
                            <div className="min-w-0">
                              <div className="flex items-baseline gap-2 flex-wrap">
                                <span className="text-[12px] font-semibold text-base-200 font-mono">{p.name}</span>
                                <span className="text-[10px] text-base-500 font-mono">{p.desc}</span>
                              </div>
                              {k ? (
                                <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                                  <span className="text-[9px] font-mono text-base-400 bg-base-900 px-1.5 py-0.5 rounded border border-base-800 truncate max-w-[110px] xs:max-w-[160px] sm:max-w-none inline-block align-middle">{k.maskedKey}</span>
                                  <span className="text-[9px] text-base-600 font-mono">Added {new Date(k.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                                </div>
                              ) : (
                                <p className="text-[10px] text-base-600 font-mono mt-1">No key configured — using platform default</p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0 w-full sm:w-auto justify-end">
                            {k && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-[10px] h-7 px-2 hover:bg-base-800 text-base-400 hover:text-base-200 flex-1 sm:flex-initial justify-center"
                                  onClick={() => handleTest(p.id)}
                                  disabled={testing !== null}
                                >
                                  {testing === p.id ? (
                                    <Loader2 className="size-3 animate-spin" />
                                  ) : (
                                    <Wifi className="size-3" />
                                  )}
                                  <span className="ml-1">Test</span>
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="text-[10px] h-7 w-7 p-0 text-red-400 hover:bg-red-500/10 hover:text-red-300 flex items-center justify-center shrink-0" 
                                  onClick={() => deleteMutation.mutate(p.id)}
                                >
                                  <Trash2 className="size-3" />
                                </Button>
                              </>
                            )}
                            <Button
                              variant="secondary"
                              size="sm"
                              className={`text-[10px] h-7 px-2 justify-center ${k ? 'flex-1 sm:flex-initial' : 'w-full sm:w-auto'}`}
                              onClick={() => { setAddProvider(p.id); setNewKey('') }}
                            >
                              {k ? <Pencil className="size-3" /> : <Plus className="size-3" />}
                              <span className="ml-1">{k ? 'Update' : 'Add'}</span>
                            </Button>
                          </div>
                        </div>

                        {testResult && testResult.providerId === p.id && (
                          <div className={`text-[10px] font-mono px-2.5 py-1 rounded-[3px] border flex items-center gap-1.5 ${
                            testResult.success 
                              ? 'bg-emerald-500/5 border-emerald-500/10 text-emerald-400' 
                              : 'bg-red-500/5 border-red-500/10 text-red-400'
                          }`}>
                            <div className={`size-1.5 rounded-full ${testResult.success ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`} />
                            <span>{testResult.message}</span>
                          </div>
                        )}
                      </div>
                    )
                  })}

                  {addProvider && (
                    <div className="rounded-[4px] border border-accent/30 bg-accent-muted p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <KeyRound className="size-3.5 text-accent" />
                        <span className="text-[11px] font-medium text-base-200 font-mono">
                          {keyMap.has(addProvider) ? 'Update' : 'Add'} {providers.find(p => p.id === addProvider)?.name} key
                        </span>
                      </div>
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                        <Input
                          type="password"
                          value={newKey}
                          onChange={e => setNewKey(e.target.value)}
                          placeholder="sk-..."
                          className="h-8 text-[12px] font-mono w-full sm:flex-1"
                          autoFocus
                          onKeyDown={e => { if (e.key === 'Enter' && newKey.trim()) saveMutation.mutate({ provider: addProvider, key: newKey.trim() }) }}
                        />
                        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                          <Button variant="primary" size="sm" onClick={() => saveMutation.mutate({ provider: addProvider, key: newKey.trim() })} disabled={!newKey.trim() || saveMutation.isPending} className="w-full sm:w-auto justify-center">
                            {saveMutation.isPending ? <Loader2 className="size-3.5 animate-spin" /> : saveMutation.isPending ? 'Saving...' : 'Save'}
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => setAddProvider('')} className="shrink-0">
                            <X className="size-3.5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="text-[10px] text-base-600 font-mono pt-1">
                    Keys are encrypted with AES-256-GCM before storage. Only the masked value is ever returned to the frontend.
                  </div>
                </div>
              </div>
            )}

            {active === 'theme' && (
              <div className="rounded-[4px] border border-base-800 bg-surface overflow-hidden">
                <div className="px-4 py-3 md:px-5 md:py-4 border-b border-base-800 bg-surface-alt flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Palette className="size-4 text-base-400" />
                    <h2 className="text-[12px] font-medium text-base-200 font-mono">Appearance</h2>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => openThemeModal(true)} className="w-full sm:w-auto justify-center">
                    <ExternalLink className="size-3.5" /> Open Theme Manager
                  </Button>
                </div>
                <div className="p-4 md:p-5">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {builtinThemes.slice(0, 8).map(t => {
                      const active = theme.id === t.id
                      return (
                        <button type="button" key={t.id} onClick={() => setTheme(t)}
                          className={`rounded-[4px] border p-3 text-left transition-all ${
                            active ? 'border-accent bg-accent-muted' : 'border-base-800 bg-base-950 hover:border-base-700'
                          }`}>
                          <div className="flex items-center gap-1.5 mb-2">
                            <span className="size-3 rounded-full border border-white/10" style={{ background: t.colors.accent }} />
                            <span className="size-3 rounded-full border border-white/10" style={{ background: t.colors.background }} />
                            <span className="size-3 rounded-full border border-white/10" style={{ background: t.colors.surface }} />
                            {active && <Check className="size-3 text-accent ml-auto" />}
                          </div>
                          <div className="text-[11px] font-mono font-medium" style={{ color: theme.id === t.id ? t.colors.accent : t.colors.text }}>
                            {t.name}
                          </div>
                        </button>
                      )
                    })}
                  </div>
                  <div className="mt-3 pt-3 border-t border-base-800 flex items-center gap-2">
                    <span className="text-[10px] font-mono text-base-500">
                      Current: <span className="text-base-300">{theme.name}</span>
                    </span>
                    <span className="text-[10px] font-mono text-base-600">·</span>
                    <span className="text-[10px] font-mono text-base-500">
                      <span className="text-base-300">{theme.colors.accent}</span> accent
                    </span>
                  </div>
                </div>
              </div>
            )}

            {active === 'usage' && (
              <>
                <div className="flex flex-wrap gap-3">
                  {[
                    { label: 'API Calls', used: '0', total: '5,000', pct: 0, icon: Activity, color: 'text-accent' },
                    { label: 'Storage', used: '0 MB', total: '1 GB', pct: 0, icon: Monitor, color: 'text-emerald-400' },
                    { label: 'AI Credits', used: '0', total: '10,000', pct: 0, icon: Terminal, color: 'text-yellow-400' },
                  ].map(m => (
                    <div key={m.label} className="flex-1 min-w-[200px] rounded-[4px] border border-base-800 bg-surface p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <m.icon className={`size-4 ${m.color}`} />
                        <span className="text-[11px] font-medium text-base-400 font-mono">{m.label}</span>
                      </div>
                      <div className="flex items-baseline gap-1.5 mb-2">
                        <span className="text-lg font-medium text-base-100 font-mono">{m.used}</span>
                        <span className="text-[11px] text-base-600 font-mono">/ {m.total}</span>
                      </div>
                      <div className="h-1.5 rounded-[2px] bg-base-800 overflow-hidden">
                        <div className="h-full rounded-[2px] bg-accent" style={{ width: `${m.pct}%` }} />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="rounded-[4px] border border-base-800 bg-surface overflow-hidden">
                  <div className="px-4 py-3 md:px-5 md:py-4 border-b border-base-800 bg-surface-alt flex items-center gap-2">
                    <Activity className="size-4 text-base-400" />
                    <h2 className="text-[12px] font-medium text-base-200 font-mono">Recent Activity</h2>
                  </div>
                  <div className="p-4 md:p-5">
                    <div className="text-center py-8">
                      <Activity className="size-6 text-base-700 mx-auto mb-2" />
                      <p className="text-[11px] text-base-600 font-mono">No recent activity</p>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
