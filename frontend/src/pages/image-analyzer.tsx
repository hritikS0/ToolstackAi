import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { imageService } from '@/services/image.service'
import { Upload, Image, Loader2, FileWarning, Lightbulb, ScanSearch, CheckCircle2, Terminal } from 'lucide-react'
import type { ImageAnalysisResult } from '@/types/api'

function ResultSkeleton() {
  return (
    <div className="space-y-2 animate-pulse">
      <div className="rounded-[4px] border border-base-800 bg-surface p-3">
        <div className="h-3 w-16 bg-base-800 rounded-[2px] mb-2" />
        <div className="space-y-1.5">
          <div className="h-2.5 bg-base-800 rounded-[2px] w-full" />
          <div className="h-2.5 bg-base-800 rounded-[2px] w-3/4" />
          <div className="h-2.5 bg-base-800 rounded-[2px] w-5/6" />
        </div>
      </div>
      <div className="rounded-[4px] border border-base-800 bg-surface p-3">
        <div className="h-3 w-24 bg-base-800 rounded-[2px] mb-2" />
        <div className="flex gap-1.5">
          <div className="h-5 w-14 bg-base-800 rounded-[2px]" />
          <div className="h-5 w-16 bg-base-800 rounded-[2px]" />
          <div className="h-5 w-12 bg-base-800 rounded-[2px]" />
        </div>
      </div>
      <div className="rounded-[4px] border border-base-800 bg-surface p-3">
        <div className="h-3 w-16 bg-base-800 rounded-[2px] mb-2" />
        <div className="space-y-1.5">
          <div className="h-2.5 bg-base-800 rounded-[2px] w-2/3" />
          <div className="h-2.5 bg-base-800 rounded-[2px] w-1/2" />
        </div>
      </div>
      <div className="rounded-[4px] border border-base-800 bg-surface p-3">
        <div className="h-3 w-20 bg-base-800 rounded-[2px] mb-2" />
        <div className="space-y-1.5">
          <div className="h-2.5 bg-base-800 rounded-[2px] w-3/4" />
          <div className="h-2.5 bg-base-800 rounded-[2px] w-1/3" />
        </div>
      </div>
    </div>
  )
}

export function ImageAnalyzerPage() {
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [results, setResults] = useState<ImageAnalysisResult | null>(null)
  const [error, setError] = useState('')
  const [dragging, setDragging] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const processFile = (f: File) => {
    setFile(f); setResults(null); setError('')
    const r = new FileReader()
    r.onload = e => setPreview(e.target?.result as string)
    r.readAsDataURL(f)
  }

  const handleAnalyze = async () => {
    if (!file || analyzing) return
    setAnalyzing(true); setError('')
    try {
      const res = await imageService.analyze(file)
      if (res.success && res.data) setResults(res.data)
    } catch {
      setError('Analysis failed.')
    } finally {
      setAnalyzing(false)
    }
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Image className="size-4 text-base-500" />
          <h1 className="text-sm font-medium text-base-100 font-mono">Image Analysis</h1>
        </div>

        {!file ? (
          <div
            onDragOver={e => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={e => { e.preventDefault(); setDragging(false); e.dataTransfer.files[0] && processFile(e.dataTransfer.files[0]) }}
            className={`border border-dashed rounded-[4px] p-6 text-center transition-colors ${dragging ? 'border-accent bg-accent-muted' : 'border-base-700 hover:border-base-600'}`}
          >
            <Upload className="size-8 text-base-600 mx-auto mb-2" />
            <p className="text-[11px] text-base-500 mb-3 font-mono">Drop an image or click to upload</p>
            <Button variant="primary" size="sm" onClick={() => fileRef.current?.click()}>Choose Image</Button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && processFile(e.target.files[0])} />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-[4px] border border-base-800 bg-surface overflow-hidden self-start">
              <div className="h-[37px] border-b border-base-800 bg-surface flex items-center px-3">
                <span className="text-[11px] text-base-500 font-mono">{file.name}</span>
              </div>
              {preview && <img src={preview} alt="preview" className="w-full object-contain max-h-[400px]" />}
              <div className="h-9 border-t border-base-800 bg-surface flex items-center px-3 gap-2">
                <Button variant="ghost" size="sm" onClick={() => { setFile(null); setPreview(null); setResults(null); setError('') }}>Change</Button>
                <Button variant="primary" size="sm" onClick={handleAnalyze} disabled={analyzing || !!results} loading={analyzing}>
                  Analyze
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              {analyzing ? (
                <ResultSkeleton />
              ) : error ? (
                <div className="rounded-[4px] border border-red-500/20 bg-red-500/5 p-3 text-[11px] text-red-400 font-mono">{error}</div>
              ) : results ? (
                <>
                  <div className="rounded-[4px] border border-base-800 bg-surface p-3">
                    <div className="flex items-center gap-1.5 mb-2">
                      <Lightbulb className="size-3.5 text-accent shrink-0" />
                      <span className="text-[10px] font-medium text-base-400 uppercase tracking-wider font-mono">Summary</span>
                    </div>
                    <p className="text-[12px] text-base-200 leading-relaxed">{results.summary}</p>
                  </div>

                  {results.detectedObjects && results.detectedObjects.length > 0 ? (
                    <div className="rounded-[4px] border border-base-800 bg-surface p-3">
                      <div className="flex items-center gap-1.5 mb-2">
                        <ScanSearch className="size-3.5 text-base-500 shrink-0" />
                        <span className="text-[10px] font-medium text-base-400 uppercase tracking-wider font-mono">Detected Objects</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {results.detectedObjects.map((o, i) => (
                          <span key={i} className="inline-flex items-center px-2 py-0.5 rounded-[2px] text-[10px] font-mono text-base-300 bg-base-800 border border-base-700">
                            {o}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {results.issues && results.issues.length > 0 ? (
                    <div className="rounded-[4px] border border-base-800 bg-surface p-3">
                      <div className="flex items-center gap-1.5 mb-2">
                        <FileWarning className="size-3.5 text-base-500 shrink-0" />
                        <span className="text-[10px] font-medium text-base-400 uppercase tracking-wider font-mono">Issues</span>
                      </div>
                      <ul className="space-y-1">
                        {results.issues.map((issue, i) => (
                          <li key={i} className="flex items-start gap-2 text-[12px] text-base-300 leading-relaxed">
                            <span className="mt-[7px] size-1 rounded-full bg-base-500 shrink-0" />
                            {issue}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}

                  {results.recommendations && results.recommendations.length > 0 ? (
                    <div className="rounded-[4px] border border-base-800 bg-surface p-3">
                      <div className="flex items-center gap-1.5 mb-2">
                        <CheckCircle2 className="size-3.5 text-base-500 shrink-0" />
                        <span className="text-[10px] font-medium text-base-400 uppercase tracking-wider font-mono">Recommendations</span>
                      </div>
                      <ul className="space-y-1">
                        {results.recommendations.map((rec, i) => (
                          <li key={i} className="flex items-start gap-2 text-[12px] text-base-300 leading-relaxed">
                            <CheckCircle2 className="size-3 text-base-500 mt-[3px] shrink-0" />
                            {rec}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}

                  {(!results.detectedObjects || results.detectedObjects.length === 0) &&
                   (!results.issues || results.issues.length === 0) &&
                   (!results.recommendations || results.recommendations.length === 0) && (
                    <div className="rounded-[4px] border border-base-800 bg-surface p-4 text-center">
                      <p className="text-[11px] text-base-600 font-mono">No objects, issues, or recommendations detected.</p>
                    </div>
                  )}
                </>
              ) : (
                <div className="rounded-[4px] border border-base-800 bg-surface p-6 text-center">
                  <p className="text-[11px] text-base-500 font-mono">Click Analyze to start</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
