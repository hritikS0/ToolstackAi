import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs } from '@/components/ui/tabs'
import { debugService } from '@/services/debug.service'
import {
  Bug, Code2, Copy, Check, Loader2, AlertTriangle, ArrowRight, ChevronDown, Terminal,
} from 'lucide-react'
import type { DebugResult } from '@/types/api'

const languages = ['JavaScript', 'TypeScript', 'Python', 'Java', 'Go', 'Rust', 'C++', 'Ruby']

export function CodeDebuggerPage() {
  const [code, setCode] = useState('')
  const [lang, setLang] = useState('JavaScript')
  const [analyzing, setAnalyzing] = useState(false)
  const [result, setResult] = useState<DebugResult | null>(null)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const [splitPos, setSplitPos] = useState(50)
  const [showLang, setShowLang] = useState(false)
  const [outputTab, setOutputTab] = useState('bugs')
  const dragging = useRef(false)

  useEffect(() => {
    const move = (e: MouseEvent) => {
      if (!dragging.current) return
      const rect = document.querySelector('.debug-split')?.getBoundingClientRect()
      if (rect) setSplitPos(Math.max(25, Math.min(75, ((e.clientX - rect.left) / rect.width) * 100)))
    }
    const up = () => { dragging.current = false }
    window.addEventListener('mousemove', move)
    window.addEventListener('mouseup', up)
    return () => { window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up) }
  }, [])

  const handleAnalyze = async () => {
    if (!code.trim() || analyzing) return
    setAnalyzing(true); setResult(null); setError('')
    try {
      const res = await debugService.analyzeCode(code, lang)
      if (res.success && res.data) setResult(res.data)
    } catch {
      setError('Analysis failed.')
    } finally {
      setAnalyzing(false)
    }
  }

  const outputTabs = [
    { id: 'bugs', label: `Bugs (${result?.bugs?.length || 0})` },
    { id: 'fixes', label: `Fixes (${result?.fixes?.length || 0})` },
    { id: 'summary', label: 'Summary' },
  ]

  return (
    <div className="flex h-full">
      <div className="debug-split flex-1 flex relative">
        <div className="flex flex-col" style={{ width: `${splitPos}%` }}>
          <div className="h-[37px] border-b border-base-800 bg-surface flex items-center px-3 gap-2 shrink-0">
            <Code2 className="size-3.5 text-base-500" />
            <span className="text-[11px] text-base-400 font-medium flex-1 font-mono">Editor</span>
            <div className="relative">
              <button type="button" onClick={() => setShowLang(!showLang)} className="flex items-center gap-1 h-6 px-2 rounded-[4px] text-[11px] text-base-400 hover:text-base-200 hover:bg-base-800 transition-colors font-mono">
                {lang} <ChevronDown className="size-3" />
              </button>
              {showLang && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowLang(false)} />
                  <div className="absolute right-0 top-full mt-1 z-50 w-32 rounded-[4px] border border-base-800 bg-surface py-0.5">
                    {languages.map(l => (
                      <button type="button" key={l} onClick={() => { setLang(l); setShowLang(false) }}
                        className={`w-full text-left px-2.5 py-1.5 text-[11px] font-mono ${l === lang ? 'text-accent bg-accent-muted' : 'text-base-400 hover:text-base-200 hover:bg-base-800'}`}>
                        {l}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
          <div className="flex-1 bg-workspace">
            <textarea
              value={code}
              onChange={e => setCode(e.target.value)}
              placeholder={`// Paste your ${lang} code here...`}
              className="w-full h-full bg-transparent text-[11px] font-mono text-base-200 placeholder:text-base-700 resize-none outline-none p-3 leading-relaxed"
            />
          </div>
          <div className="h-10 border-t border-base-800 bg-surface flex items-center px-3 shrink-0">
            <Button variant="primary" size="sm" onClick={handleAnalyze} disabled={!code.trim() || analyzing} loading={analyzing}>
              <Bug className="size-3.5" />
              Analyze
            </Button>
          </div>
        </div>

        <div className="w-[3px] bg-base-800 hover:bg-accent/50 cursor-col-resize transition-colors shrink-0" onMouseDown={() => { dragging.current = true }} />

        <div className="flex-1 flex flex-col min-w-0">
          <div className="h-[37px] border-b border-base-800 bg-surface flex items-center px-3 gap-2 shrink-0">
            <span className="text-[11px] text-base-400 font-medium font-mono">Analysis</span>
          </div>
          {analyzing ? (
            <div className="flex-1 flex items-center justify-center">
              <Loader2 className="size-5 animate-spin text-base-500" />
            </div>
          ) : error ? (
            <div className="flex-1 flex items-center justify-center p-4">
              <div className="text-[11px] text-red-400 font-mono">{error}</div>
            </div>
          ) : result ? (
            <div className="flex-1 flex flex-col min-h-0">
              <div className="p-1.5 border-b border-base-800">
                <Tabs tabs={outputTabs} activeTab={outputTab} onTabChange={setOutputTab} />
              </div>
              <div className="flex-1 overflow-y-auto p-2">
                {outputTab === 'bugs' && (
                  <div className="space-y-1.5">
                    {result.bugs?.map((b, i) => (
                      <div key={i} className="flex items-start gap-2 p-2 rounded-[4px] bg-surface-alt border border-base-800">
                        <div className="flex flex-col gap-1 shrink-0">
                          <Badge variant={b.severity === 'high' ? 'error' : b.severity === 'medium' ? 'warn' : 'neutral'} className="text-[9px]">L{b.line}</Badge>
                        </div>
                        <div className="text-[11px] text-base-400">{b.description}</div>
                      </div>
                    ))}
                    {(!result.bugs || result.bugs.length === 0) && <p className="text-[11px] text-base-600 text-center py-4 font-mono">No bugs found</p>}
                  </div>
                )}
                {outputTab === 'fixes' && (
                  <ul className="space-y-1.5">
                    {result.fixes?.map((f, i) => (
                      <li key={i} className="flex items-start gap-2 text-[11px] text-base-400 p-2">
                        <ArrowRight className="size-3.5 text-base-400 mt-0.5 shrink-0" />
                        {f}
                      </li>
                    ))}
                    {(!result.fixes || result.fixes.length === 0) && <p className="text-[11px] text-base-600 text-center py-4 font-mono">No fixes suggested</p>}
                  </ul>
                )}
                {outputTab === 'summary' && (
                  <div className="text-[11px] text-base-400 p-2">{result.summary || 'No summary available'}</div>
                )}
              </div>
              <div className="border-t border-base-800 bg-surface">
                <div className="flex items-center justify-between px-3 h-8">
                  <span className="text-[10px] text-base-500 font-medium font-mono uppercase tracking-wider">Optimized Code</span>
                  <Button variant="ghost" size="sm" onClick={() => { navigator.clipboard.writeText(result.optimizedCode || ''); setCopied(true); setTimeout(() => setCopied(false), 2000) }}>
                    {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                  </Button>
                </div>
                <pre className="p-3 text-[11px] font-mono text-base-400 leading-relaxed overflow-x-auto max-h-40 bg-workspace border-t border-base-800">{result.optimizedCode || 'No optimized code available'}</pre>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <Bug className="size-8 text-base-700 mx-auto mb-2" />
                <p className="text-[11px] text-base-600 font-mono">Paste code and click Analyze</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
