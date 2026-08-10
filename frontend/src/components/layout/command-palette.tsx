import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, MessageSquare, Bug, LayoutDashboard, History } from 'lucide-react'

const commands = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
  { icon: MessageSquare, label: 'AI Chat', path: '/chat' },
  // { icon: Image, label: 'Image Analysis', path: '/image' },
  // { icon: Bug, label: 'Code Debugger', path: '/debug' },
  { icon: History, label: 'History', path: '/conversations' },
]

export function CommandPalette({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()

  const filtered = commands.filter(c => c.label.toLowerCase().includes(query.toLowerCase()))

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 30)
      setQuery('')
      setSelected(0)
    }
  }, [isOpen])

  useEffect(() => { setSelected(0) }, [query])

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelected(i => Math.min(i + 1, filtered.length - 1)) }
    if (e.key === 'ArrowUp') { e.preventDefault(); setSelected(i => Math.max(i - 1, 0)) }
    if (e.key === 'Enter' && filtered[selected]) { navigate(filtered[selected].path); onClose() }
    if (e.key === 'Escape') onClose()
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh]">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/60" onClick={onClose} />
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: -8 }}
            transition={{ duration: 0.12 }}
            className="relative z-50 w-full max-w-md rounded-lg border border-base-800 bg-surface shadow-2xl overflow-hidden"
          >
            <div className="flex items-center gap-2.5 px-3 h-10 border-b border-base-800">
              <Search className="size-3.5 text-base-500" />
              <input
                ref={inputRef}
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={onKey}
                placeholder="Go to..."
                className="flex-1 bg-transparent text-xs text-base-100 placeholder:text-base-500 outline-none"
              />
            </div>
            <div className="max-h-60 overflow-y-auto p-1">
              {filtered.length === 0 ? (
                <p className="text-xs text-base-500 text-center py-6">No results</p>
              ) : (
                filtered.map((cmd, i) => (
                  <button type="button"
                    key={cmd.path}
                    onClick={() => { navigate(cmd.path); onClose() }}
                    onMouseEnter={() => setSelected(i)}
                    className={`flex items-center gap-2.5 w-full px-2.5 py-2 rounded-[4px] text-xs transition-colors ${i === selected ? 'bg-accent-muted text-accent' : 'text-base-300 hover:bg-base-800'
                      }`}
                  >
                    <cmd.icon className="size-3.5" />
                    {cmd.label}
                  </button>
                ))
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
