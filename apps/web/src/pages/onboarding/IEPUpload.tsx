import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { useAppStore } from '@/store/app'
import { uploadIEP, getIEPStatus } from '@/lib/api'
import { Upload, FileText, CheckCircle, XCircle, ChevronDown } from 'lucide-react'
import type { IEPGoal } from '@myautismguidance/shared-types'

type ParseStatus = 'idle' | 'uploading' | 'parsing' | 'review' | 'error'

export function IEPUpload() {
  const navigate = useNavigate()
  const { activeChildId } = useAppStore()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [status, setStatus] = useState<ParseStatus>('idle')
  const [dragOver, setDragOver] = useState(false)
  const [fileName, setFileName] = useState('')
  const [parsedGoals, setParsedGoals] = useState<IEPGoal[]>([])
  const [parsedServices, setParsedServices] = useState<{ type: string; hoursPerWeek: number }[]>([])
  const [accommodations, setAccommodations] = useState<string[]>([])

  async function handleFile(file: File) {
    if (!file || !activeChildId) return
    if (!file.name.endsWith('.pdf')) {
      alert('Please upload a PDF file.')
      return
    }
    if (file.size > 20 * 1024 * 1024) {
      alert('File must be under 20MB.')
      return
    }

    setFileName(file.name)
    setStatus('uploading')

    try {
      const { jobId } = await uploadIEP(activeChildId, file)
      setStatus('parsing')

      // Poll for job completion
      let attempts = 0
      const poll = setInterval(async () => {
        attempts++
        try {
          const result = await getIEPStatus(jobId)
          if (result.status === 'complete') {
            clearInterval(poll)
            const data = result.result as { goals: IEPGoal[]; services: { type: string; hoursPerWeek: number }[]; accommodations: string[] }
            setParsedGoals((data?.goals || []).map((g: IEPGoal) => ({ ...g, keep: true })))
            setParsedServices(data?.services || [])
            setAccommodations(data?.accommodations || [])
            setStatus('review')
          } else if (result.status === 'failed' || attempts > 30) {
            clearInterval(poll)
            setStatus('error')
          }
        } catch {
          if (attempts > 30) {
            clearInterval(poll)
            setStatus('error')
          }
        }
      }, 2000)
    } catch {
      setStatus('error')
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  function toggleGoal(id: string) {
    setParsedGoals((prev) =>
      prev.map((g) => (g.id === id ? { ...g, keep: !g.keep } : g))
    )
  }

  return (
    <div className="min-h-screen bg-paper">
      <div className="h-1 bg-line">
        <div className="h-1 bg-accent" style={{ width: '80%' }} />
      </div>

      <div className="max-w-checkin mx-auto px-5 py-8">
        <div className="mb-8">
          <span className="font-serif text-xl text-ink-1">myautismguidance</span>
          <p className="text-sm text-ink-4 mt-1">IEP document — optional</p>
        </div>

        {status === 'idle' && (
          <div className="space-y-5 animate-[fadeIn_200ms_ease-out]">
            <div className="bubble-app">
              Do you have your child's IEP document handy? If you can upload it, I can read it directly and save you a lot of typing. You'll be able to review everything I extract before it affects anything.
            </div>

            {/* Upload zone */}
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              className={`relative flex flex-col items-center justify-center gap-3 border-2 border-dashed rounded-md p-10 cursor-pointer transition-colors duration-2 ${
                dragOver ? 'border-accent bg-accent-soft' : 'border-line hover:border-accent hover:bg-paper-2'
              }`}
            >
              <FileText size={32} strokeWidth={1.5} className="text-ink-4" />
              <div className="text-center">
                <p className="font-medium text-ink-2">Drag your IEP PDF here, or click to browse</p>
                <p className="text-sm text-ink-4 mt-1">PDF only · Max 20MB</p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
              />
            </div>

            <div className="flex flex-col gap-2">
              <Button variant="secondary" onClick={() => navigate('/')} className="w-full">
                I'll describe it instead
              </Button>
              <button
                onClick={() => navigate('/')}
                className="text-sm text-ink-4 hover:text-ink-2 transition-colors text-center py-2"
              >
                I don't have an IEP yet — skip this
              </button>
            </div>
          </div>
        )}

        {(status === 'uploading' || status === 'parsing') && (
          <div className="flex flex-col items-center gap-5 py-16 animate-[fadeIn_200ms_ease-out]">
            <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin" />
            <div className="text-center">
              <p className="font-medium text-ink-1">
                {status === 'uploading' ? 'Uploading your document...' : 'Reading your IEP document...'}
              </p>
              <p className="text-sm text-ink-4 mt-1">{fileName}</p>
              {status === 'parsing' && (
                <p className="text-sm text-ink-4 mt-3">This typically takes 15–30 seconds</p>
              )}
            </div>
          </div>
        )}

        {status === 'error' && (
          <div className="space-y-5 animate-[fadeIn_200ms_ease-out]">
            <div className="flex items-center gap-3 p-4 bg-danger-soft rounded-md border border-danger/20">
              <XCircle size={20} className="text-danger" />
              <div>
                <p className="font-medium text-danger">Couldn't read this document</p>
                <p className="text-sm text-ink-3 mt-0.5">
                  The PDF may be scanned or protected. Try describing the IEP instead.
                </p>
              </div>
            </div>
            <Button variant="secondary" onClick={() => navigate('/')} className="w-full">
              Continue without uploading
            </Button>
            <Button onClick={() => setStatus('idle')} variant="ghost" className="w-full">
              Try a different file
            </Button>
          </div>
        )}

        {status === 'review' && (
          <div className="space-y-6 animate-[fadeIn_200ms_ease-out]">
            <div className="bubble-app">
              Here's what I found in your IEP document. Review each item and keep what looks right.
            </div>

            {parsedGoals.length > 0 && (
              <Card>
                <div className="p-4 border-b border-line">
                  <h3 className="font-semibold text-ink-1">IEP Goals</h3>
                  <p className="text-sm text-ink-4">Toggle off any goals that weren't extracted correctly</p>
                </div>
                <div className="divide-y divide-line">
                  {parsedGoals.map((goal) => (
                    <div key={goal.id} className="flex items-start gap-3 p-4">
                      <button
                        onClick={() => toggleGoal(goal.id)}
                        className={`mt-0.5 flex-shrink-0 ${goal.keep ? 'text-success' : 'text-ink-4'}`}
                      >
                        {goal.keep ? <CheckCircle size={18} /> : <XCircle size={18} />}
                      </button>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-ink-2 leading-relaxed">{goal.text}</p>
                        <span className="inline-block mt-1 text-2xs font-medium text-accent bg-accent-soft px-2 py-0.5 rounded-pill">
                          {goal.domainTag}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {parsedServices.length > 0 && (
              <Card>
                <div className="p-4 border-b border-line">
                  <h3 className="font-semibold text-ink-1">Services</h3>
                </div>
                <div className="p-4 space-y-2">
                  {parsedServices.map((s, i) => (
                    <div key={i} className="flex items-center justify-between text-sm">
                      <span className="text-ink-2">{s.type}</span>
                      <span className="text-ink-4">{s.hoursPerWeek}h/week</span>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {accommodations.length > 0 && (
              <Card>
                <div className="p-4 border-b border-line">
                  <h3 className="font-semibold text-ink-1">Accommodations</h3>
                </div>
                <div className="p-4">
                  <ul className="space-y-1.5">
                    {accommodations.map((a, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-ink-2">
                        <span className="text-success mt-0.5">✓</span>
                        {a}
                      </li>
                    ))}
                  </ul>
                </div>
              </Card>
            )}

            <Button onClick={() => navigate('/')} className="w-full" size="lg">
              Confirm and build my plan
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
