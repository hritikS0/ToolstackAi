import { useState, memo } from 'react'
import ReactMarkdown from 'react-markdown'
import rehypeHighlight from 'rehype-highlight'
import remarkGfm from 'remark-gfm'
import { cn } from '@/lib/utils'
import { Copy, Check, RefreshCw, Pencil, Sparkles } from 'lucide-react'

interface MessageBlockProps {
  role: 'user' | 'assistant'
  content: string
  timestamp?: string
  modelName?: string
  tokenSpeed?: string
  isStreaming?: boolean
  isThinking?: boolean
  thinkingMessage?: string
  onRetry?: () => void
  onCopy?: () => void
  onEdit?: () => void
  imageUrl?: string
}

function TerminalCursor() {
  return <span className="terminal-cursor ml-0.5 text-accent/70">▋</span>
}

function AssistantMessage({
  content, timestamp, modelName, tokenSpeed, isStreaming, isThinking, thinkingMessage,
  onRetry, onCopy, onEdit,
}: MessageBlockProps) {
  const [copied, setCopied] = useState(false)
  const safeContent = String(content)
  const hasContent = safeContent.length > 0
  const showThinking = isThinking && !hasContent

  const handleCopy = () => {
    navigator.clipboard.writeText(safeContent)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="group rounded-[4px] border border-base-800 bg-surface overflow-hidden">
      <div className="flex items-center justify-between h-8 px-3 border-b border-base-800 bg-base-950/50">
        <div className="flex items-center gap-2">
          <Sparkles className="size-3.5 text-accent/60" />
          <span className="text-[14px] font-medium text-accent">{modelName || 'ToolStackAI'}</span>
          {showThinking && (
            <span className="text-[13px] text-base-500 font-mono">thinking</span>
          )}
          {tokenSpeed && (
            <span className="text-[13px] text-base-600 font-mono">{tokenSpeed}</span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {timestamp && (
            <span className="text-[13px] text-base-600 font-mono">{timestamp}</span>
          )}
        </div>
      </div>

      <div className="px-4 py-3.5 min-h-[32px]">
        <span className={cn(
          'text-[15px] leading-relaxed',
          showThinking ? 'text-base-400 font-mono' : 'text-base-200',
          !showThinking && hasContent && (isStreaming || isThinking) && 'thinking-fade-in',
          isStreaming && hasContent && 'streaming-in'
        )}>
          {showThinking ? (
            <>{thinkingMessage || 'Thinking...'}<TerminalCursor /></>
          ) : hasContent ? (
            <>
              <div className="prose prose-invert max-w-none text-[15px] leading-relaxed">
                <ReactMarkdown
                  rehypePlugins={[rehypeHighlight]}
                  remarkPlugins={[remarkGfm]}
                  components={{
                    a: ({ href, children }) => (
                      <a href={href} target="_blank" rel="noopener noreferrer">{children}</a>
                    ),
                  }}
                >
                  {safeContent}
                </ReactMarkdown>
              </div>
              {isStreaming && <TerminalCursor />}
            </>
          ) : (
            <span className="text-base-600 font-mono italic">Ready</span>
          )}
        </span>
      </div>

      <div className="flex items-center gap-1 px-3 py-1.5 border-t border-base-800 opacity-0 group-hover:opacity-100 transition-opacity">
        <button type="button"
          onClick={handleCopy}
          className="flex items-center gap-1 h-6 px-1.5 rounded-[2px] text-[13px] text-base-500 hover:text-base-300 hover:bg-base-800 transition-colors"
        >
          {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
          {copied ? 'Copied' : 'Copy'}
        </button>
        {onEdit && (
          <button type="button"
            onClick={onEdit}
            className="flex items-center gap-1 h-6 px-1.5 rounded-[2px] text-[13px] text-base-500 hover:text-base-300 hover:bg-base-800 transition-colors"
          >
            <Pencil className="size-3" />
            Edit
          </button>
        )}
        {onRetry && (
          <button type="button"
            onClick={onRetry}
            className="flex items-center gap-1 h-6 px-1.5 rounded-[2px] text-[13px] text-base-500 hover:text-base-300 hover:bg-base-800 transition-colors"
          >
            <RefreshCw className="size-3" />
            Retry
          </button>
        )}
      </div>
    </div>
  )
}

function UserMessage({ content, imageUrl }: { content: string; imageUrl?: string }) {
  return (
    <div className="flex justify-end animate-fade-in">
      <div className="max-w-[90%] rounded-[4px] bg-accent-muted border border-accent/20 px-3 py-2 space-y-2">
        {imageUrl && (
          <img src={imageUrl} alt="Attached" className="max-w-full h-auto max-h-48 rounded-[3px] border border-accent/10" />
        )}
        {content && <div className="text-[15px] text-base-200 whitespace-pre-wrap">{String(content)}</div>}
      </div>
    </div>
  )
}

function arePropsEqual(prev: MessageBlockProps, next: MessageBlockProps) {
  return (
    prev.role === next.role &&
    prev.content === next.content &&
    prev.timestamp === next.timestamp &&
    prev.modelName === next.modelName &&
    prev.tokenSpeed === next.tokenSpeed &&
    prev.isStreaming === next.isStreaming &&
    prev.isThinking === next.isThinking &&
    prev.thinkingMessage === next.thinkingMessage &&
    prev.imageUrl === next.imageUrl
  )
}

export const MessageBlock = memo(function MessageBlock(props: MessageBlockProps) {
  if (props.role === 'assistant') {
    return <AssistantMessage {...props} />
  }
  return <UserMessage content={String(props.content)} imageUrl={props.imageUrl} />
}, arePropsEqual)
