import { useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Send, Loader2, ImagePlus, X, Square, FileText, ArrowRight } from 'lucide-react'

interface ComposerProps {
  value: string
  onChange: (value: string) => void
  onSend: () => void
  onStop?: () => void
  disabled?: boolean
  placeholder?: string
  attachedImage?: { file: File; preview: string } | null
  attachedPdf?: { file: File; name: string; size: string } | null
  onAttachImage?: () => void
  onRemoveImage?: () => void
  onAttachPdf?: () => void
  onRemovePdf?: () => void
  onAttachFile?: (file: File) => void
  uploadingPdf?: boolean
}

export function Composer({
  value,
  onChange,
  onSend,
  onStop,
  disabled,
  placeholder,
  attachedImage,
  attachedPdf,
  onAttachImage,
  onRemoveImage,
  onAttachPdf,
  onRemovePdf,
  onAttachFile,
  uploadingPdf,
}: ComposerProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      if (e.nativeEvent.isComposing || disabled || !canSend) return
      e.preventDefault()
      onSend()
    }
    if (e.key === 'Escape' && disabled && onStop) {
      e.preventDefault()
      onStop()
    }
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    if (!onAttachFile) return
    const files = e.clipboardData?.files
    if (files && files.length > 0) {
      const file = files[0]
      if (file.type.startsWith('image/') || file.type === 'application/pdf') {
        e.preventDefault()
        onAttachFile(file)
      }
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!onAttachFile || disabled) return
    const files = e.dataTransfer?.files
    if (files && files.length > 0) {
      const file = files[0]
      if (file.type.startsWith('image/') || file.type === 'application/pdf') {
        onAttachFile(file)
      }
    }
  }

  useEffect(() => {
    const el = textareaRef.current
    if (el) {
      el.style.height = 'auto'
      el.style.height = Math.min(el.scrollHeight, 200) + 'px'
      el.focus()
    }
  }, [value])

  const canSend = (!!value.trim() || !!attachedImage || !!attachedPdf) && !disabled

  return (
    <div
      className="border-t border-base-800 p-3 bg-surface"
      onDragOver={(e) => {
        e.preventDefault()
        e.stopPropagation()
      }}
      onDrop={handleDrop}
    >
      <div className="max-w-4xl mx-auto">
        {(attachedImage || attachedPdf) && (
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            {attachedImage && (
              <div className="relative group inline-flex items-center gap-2.5 p-1.5 pr-2.5 rounded-[6px] bg-base-900 border border-base-700 animate-fade-in">
                <img
                  src={attachedImage.preview}
                  alt="Attached"
                  className="size-11 rounded-[4px] object-cover border border-base-750"
                />
                <div className="flex flex-col min-w-0 max-w-[150px]">
                  <span className="text-[12px] font-mono text-base-200 truncate">{attachedImage.file.name}</span>
                  <span className="text-[10px] font-mono text-base-500">Image attached</span>
                </div>
                {onRemoveImage && (
                  <button
                    type="button"
                    onClick={onRemoveImage}
                    className="size-5 rounded-full bg-base-800 border border-base-700 flex items-center justify-center hover:bg-base-600 transition-colors ml-1 cursor-pointer"
                    title="Remove image"
                  >
                    <X className="size-3 text-base-300" />
                  </button>
                )}
              </div>
            )}

            {attachedPdf && (
              <div className="relative group inline-flex items-center gap-2.5 p-2 pr-3 rounded-[6px] bg-base-900 border border-base-700 animate-fade-in">
                <div className="size-9 rounded-[4px] bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0">
                  <FileText className="size-4 text-red-400" />
                </div>
                <div className="flex flex-col min-w-0 max-w-[170px]">
                  <span className="text-[12px] font-mono text-base-200 truncate">{attachedPdf.name}</span>
                  <span className="text-[10px] font-mono text-base-500">{attachedPdf.size}</span>
                </div>
                {onRemovePdf && (
                  <button
                    type="button"
                    onClick={onRemovePdf}
                    className="size-5 rounded-full bg-base-800 border border-base-700 flex items-center justify-center hover:bg-base-600 transition-colors ml-1 cursor-pointer"
                    title="Remove PDF"
                  >
                    <X className="size-3 text-base-300" />
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        <div className="flex items-end gap-2 rounded-[4px] border border-base-700 bg-base-950 px-3 py-2 focus-within:border-accent/40 transition-colors">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={e => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            placeholder={placeholder || (attachedPdf ? 'Ask something about this PDF or press send...' : attachedImage ? 'Ask something about this photo or press send...' : 'Type a message...')}
            rows={1}
            disabled={disabled}
            autoFocus
            className="flex-1 bg-transparent text-[15px] text-base-100 placeholder:text-base-600 resize-none outline-none min-h-[24px] max-h-[200px] leading-relaxed font-mono disabled:opacity-40"
          />
          <div className="flex items-center gap-1 shrink-0">
            {onAttachPdf && (
              uploadingPdf ? (
                <span className="size-7 rounded-[4px] flex items-center justify-center text-base-500">
                  <Loader2 className="size-3.5 animate-spin" />
                </span>
              ) : (
                <button type="button"
                  onClick={onAttachPdf}
                  className="size-7 rounded-[4px] flex items-center justify-center text-base-500 hover:text-base-300 hover:bg-base-800 transition-colors cursor-pointer"
                  title="Attach a PDF document"
                >
                  <FileText className="size-3.5" />
                </button>
              )
            )}
            {onAttachImage && (
              <button type="button"
                onClick={onAttachImage}
                className="size-7 rounded-[4px] flex items-center justify-center text-base-500 hover:text-base-300 hover:bg-base-800 transition-colors cursor-pointer"
                title="Attach image"
              >
                <ImagePlus className="size-3.5" />
              </button>
            )}
            {disabled && onStop ? (
              <button
                type="button"
                onClick={onStop}
                className="size-7 rounded-[4px] flex items-center justify-center bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors cursor-pointer"
                title="Stop generating"
              >
                <Square className="size-3" />
              </button>
            ) : (
              <Button variant="primary" size="icon" onClick={onSend} disabled={!canSend} className="shrink-0 size-7">
                {disabled ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}
              </Button>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between mt-2 px-1 text-[11px] font-mono text-base-500">
          <div className="flex items-center gap-1.5">
            <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>Model: <span className="text-base-300 font-medium">NVIDIA Llama 3.2 11B Vision</span></span>
          </div>
          <a
            href="/settings"
            className="text-base-500 hover:text-accent transition-colors flex items-center gap-1 font-mono"
            title="Configure API Keys & Models"
          >
            Change in Settings <ArrowRight className="size-3" />
          </a>
        </div>
      </div>
    </div>
  )
}
