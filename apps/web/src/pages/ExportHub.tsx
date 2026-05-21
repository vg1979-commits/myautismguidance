import { useState } from 'react'
import { useAppStore } from '@/store/app'
import { generateExport, getExports } from '@/lib/api'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Download, FileText, Users, Clock, ExternalLink } from 'lucide-react'
import type { ExportType, ExportDepth } from '@myautismguidance/shared-types'
import { cn } from '@/lib/utils'

const SCHOOL_EXPORTS: { type: ExportType; title: string; desc: string; icon: typeof FileText }[] = [
  {
    type: 'iep-summary',
    title: 'IEP advocacy summary',
    desc: 'Progress data, SMART goal drafts, and talking points for your next IEP meeting.',
    icon: FileText,
  },
  {
    type: 'teacher-card',
    title: 'Teacher quick-reference',
    desc: 'One-page summary of what helps, what to watch for, and how to communicate.',
    icon: Users,
  },
]

const THERAPY_EXPORTS: { type: ExportType; title: string; desc: string; specialty: string }[] = [
  { type: 'aba-report', title: 'ABA therapist report', desc: 'Behavior patterns, strategy outcomes, and home generalization data.', specialty: 'ABA' },
  { type: 'ot-report', title: 'OT report', desc: 'Sensory observations, ADL progress, and home environment notes.', specialty: 'OT' },
  { type: 'slt-report', title: 'Speech-language report', desc: 'Communication observations, scripts used, and conversational data.', specialty: 'SLT' },
  { type: 'psychologist-report', title: 'Psychologist report', desc: 'Emotional regulation, anxiety patterns, and behavioral context.', specialty: 'Psych' },
]

interface ExportCardProps {
  title: string
  desc: string
  exportType: ExportType
  childId: string | null
  badge?: string
}

function ExportCard({ title, desc, exportType, childId, badge }: ExportCardProps) {
  const [depth, setDepth] = useState<ExportDepth>('summary')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [showDepthModal, setShowDepthModal] = useState(false)

  async function generate() {
    if (!childId) return
    setLoading(true)
    try {
      const record = await generateExport(childId, exportType, depth)
      setDone(true)
      if (record.downloadUrl) window.open(record.downloadUrl, '_blank')
    } catch {
      // handle gracefully
    } finally {
      setLoading(false)
      setShowDepthModal(false)
    }
  }

  return (
    <div className="card p-5">
      {badge && (
        <span className="inline-block mb-3 text-2xs font-semibold text-white bg-setting-therapy rounded-pill px-2 py-0.5">
          {badge}
        </span>
      )}
      <h3 className="font-semibold text-ink-1 mb-1">{title}</h3>
      <p className="text-sm text-ink-3 leading-relaxed mb-4">{desc}</p>

      {done ? (
        <div className="flex items-center gap-2 text-sm text-success font-medium">
          <span>✓</span> Document generated
        </div>
      ) : showDepthModal ? (
        <div className="space-y-3 animate-[fadeIn_150ms_ease-out]">
          <p className="text-sm font-medium text-ink-2">Depth</p>
          <div className="flex gap-2">
            {(['summary', 'clinical'] as ExportDepth[]).map((d) => (
              <button
                key={d}
                onClick={() => setDepth(d)}
                className={cn(
                  'flex-1 py-2 text-sm rounded-sm border transition-colors',
                  depth === d ? 'border-accent bg-accent-soft text-accent font-medium' : 'border-line text-ink-3 hover:bg-paper-2'
                )}
              >
                {d === 'summary' ? 'Summary' : 'Clinical detail'}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <Button size="sm" loading={loading} onClick={generate} className="flex-1">
              <Download size={14} /> Generate PDF
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setShowDepthModal(false)}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <Button size="sm" variant="secondary" onClick={() => setShowDepthModal(true)}>
          Generate
        </Button>
      )}
    </div>
  )
}

export function ExportHub() {
  const { activeChildId } = useAppStore()

  return (
    <div className="min-h-screen bg-paper">
      <div className="h-14 border-b border-line bg-white flex items-center px-5 sticky top-0 z-10">
        <h1 className="font-semibold text-ink-1">Share</h1>
      </div>

      <div className="max-w-dashboard mx-auto px-5 md:px-8 py-6 space-y-10">
        {/* Disclaimer */}
        <div className="p-4 bg-paper-2 border border-line rounded-md text-sm text-ink-4">
          All documents are labeled "based on caregiver observation" and include a disclaimer. Nothing is sent automatically — you control every share.
        </div>

        {/* School section */}
        <section>
          <h2 className="font-serif text-2xl text-ink-1 mb-1">School documents</h2>
          <p className="text-sm text-ink-4 mb-4">For IEP meetings and day-to-day teacher communication.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {SCHOOL_EXPORTS.map(({ type, title, desc }) => (
              <ExportCard
                key={type}
                title={title}
                desc={desc}
                exportType={type}
                childId={activeChildId}
              />
            ))}
          </div>
        </section>

        {/* Therapy section */}
        <section>
          <h2 className="font-serif text-2xl text-ink-1 mb-1">Therapist reports</h2>
          <p className="text-sm text-ink-4 mb-4">Share home observations with your child's clinical team.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {THERAPY_EXPORTS.map(({ type, title, desc, specialty }) => (
              <ExportCard
                key={type}
                title={title}
                desc={desc}
                exportType={type}
                childId={activeChildId}
                badge={specialty}
              />
            ))}
          </div>
        </section>

        {/* Export history */}
        <section>
          <h2 className="font-serif text-2xl text-ink-1 mb-4">Export history</h2>
          <div className="card divide-y divide-line">
            {[
              { type: 'Teacher quick-reference', date: 'May 12, 2026', status: 'active' },
              { type: 'IEP advocacy summary', date: 'Apr 28, 2026', status: 'expired' },
              { type: 'OT report', date: 'Apr 14, 2026', status: 'active' },
            ].map(({ type, date, status }) => (
              <div key={`${type}-${date}`} className="flex items-center justify-between px-5 py-4">
                <div>
                  <p className="text-sm font-medium text-ink-2">{type}</p>
                  <p className="text-xs text-ink-4 mt-0.5 flex items-center gap-1.5">
                    <Clock size={11} /> {date}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={cn(
                    'text-2xs font-medium px-2 py-0.5 rounded-pill',
                    status === 'active' ? 'bg-success-soft text-success' : 'bg-paper-3 text-ink-4'
                  )}>
                    {status === 'active' ? 'Active link' : 'Expired'}
                  </span>
                  {status === 'active' && (
                    <button className="text-ink-4 hover:text-ink-2 transition-colors">
                      <ExternalLink size={14} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
