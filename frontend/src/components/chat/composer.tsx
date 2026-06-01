import { useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Send, Loader2, ImagePlus, X } from 'lucide-react'

interface ComposerProps {
  value: string
  onChange: (value: string) => void
  onSend: () => void
  disabled?: boolean
  placeholder?: string
  attachedImage?: { file: File; preview: string }
  onAttachImage?: () => void
  onRemoveImage?: () => void
}

export function Composer({ value, onChange, onSend, disabled, placeholder, attachedImage, onAttachImage, onRemoveImage }: ComposerProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      onSend()
    }
  }

  useEffect(() => {
    const el = textareaRef.current
    if (el) {
      el.style.height = 'auto'
      el.style.height = Math.min(el.scrollHeight, 200) + 'px'
    }
  }, [value])

  return (
    <div className="border-t border-base-800 p-3 bg-surface">
      <div className="max-w-4xl mx-auto">
        {attachedImage && (
          <div className="relative inline-block mb-2">
            <img
              src={attachedImage.preview}
              alt="Attached"
              className="size-16 rounded-[4px] object-cover border border-base-700"
            />
            <button type="button"
              onClick={onRemoveImage}
              className="absolute -top-1.5 -right-1.5 size-4 rounded-full bg-base-800 border border-base-700 flex items-center justify-center hover:bg-base-600 transition-colors"
            >
              <X className="size-2.5 text-base-300" />
            </button>
          </div>
        )}
        <div className="flex items-end gap-2 rounded-[4px] border border-base-700 bg-base-950 px-3 py-2 focus-within:border-accent/40 transition-colors">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={e => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder || 'Type a message...'}
            rows={1}
            disabled={disabled}
            className="flex-1 bg-transparent text-[12px] text-base-100 placeholder:text-base-600 resize-none outline-none min-h-[20px] max-h-[200px] leading-relaxed font-mono disabled:opacity-40"
          />
          <div className="flex items-center gap-1 shrink-0">
            {onAttachImage && (
              <button type="button"
                onClick={onAttachImage}
                className="size-7 rounded-[4px] flex items-center justify-center text-base-500 hover:text-base-300 hover:bg-base-800 transition-colors"
                title="Attach image"
              >
                <ImagePlus className="size-3.5" />
              </button>
            )}
            <Button variant="primary" size="icon" onClick={onSend} disabled={(!value.trim() && !attachedImage) || disabled} className="shrink-0 size-7">
              {disabled ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
