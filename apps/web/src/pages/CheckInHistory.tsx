import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { useAppStore } from '@/store/app'
import { getCheckinHistory } from '@/lib/api'
import type { CheckInHistoryItem } from '@/lib/api'
import { DOMAIN_LABELS } from '@myautismguidance/shared-types'
import { cn } from '@/lib/utils'
import { SettingBadge } from '@/components/ui/Badge'

const TONE_LABEL: Record<string, { label: string; color: string }> = {
  overwhelmed: { label: 'Overwhelmed', color: 'text-danger' },
  coping:      { label: 'Coping',      color: 'text-warning' },
  positive:    { label: 'Positive',    color: 'text-success' },
  neutral:     { label: 'Neutral',     color: 'text-ink-3' },
}

function CheckInRow({ item }: { item: CheckInHistoryItem }) {
  const [expanded, setExpanded] = useState(false)
  const tone = TONE_LABEL[item.caregiverTone] ?? { label: item.caregiverTone, color: 'text-ink-3' }

  const submittedDate = new Date(item.submittedAt).toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
  })
  const submittedTime = new Date(item.submittedAt).toLocaleTimeString('en-US', {
    hour: 'numeric', minute: '2-digit',
  })

  const domains = item.signalJson?.domains_mentioned ?? []

  return (
    <div className="border border-line rounded-md overflow-hidden bg-white">
      {/* Header row */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-paper-2 transition-colors"
      >
        <div className="flex items-center gap-4 min-w-0">
          <div className="shrink-0">
            <p className="text-sm font-medium text-ink-1">Week {item.weekNumber}</p>
            <p className="text-xs text-ink-4 mt-0.5">{submittedDate} · {submittedTime}</p>
          </div>

          <div className="hidden sm:flex items-center gap-2 flex-wrap">
            {domains.slice(0, 3).map((d) => (
              <span key={d} className="text-2xs bg-paper-2 border border-line px-2 py-0.5 rounded-pill text-ink-3">
                {DOMAIN_LABELS[d] ?? d}
              </span>
            ))}
            {domains.length > 3 && (
              <span className="text-2xs text-ink-4">+{domains.length - 3} more</span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4 shrink-0 ml-3">
          <span className={cn('text-xs font-medium', tone.color)}>{tone.label}</span>
          <span className="text-2xs text-ink-4">{item.cardCount} card{item.cardCount !== 1 ? 's' : ''}</span>
          {expanded ? <ChevronUp size={16} className="text-ink-4" /> : <ChevronDown size={16} className="text-ink-4" />}
        </div>
      </button>

      {/* Expanded detail */}
      {expanded && (
        <div className="border-t border-line px-5 py-4 space-y-4 animate-[fadeIn_150ms_ease-out]">
          {/* What you wrote */}
          <div>
            <p className="text-2xs font-semibold text-ink-4 uppercase tracking-caps mb-1.5">What you shared</p>
            <p className="text-sm text-ink-2 leading-relaxed whitespace-pre-wrap">{item.rawText}</p>
          </div>

          {/* Signals */}
          {item.signalJson && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {item.signalJson.strengths_mentioned.length > 0 && (
                <div className="p-3 bg-success-soft rounded-md">
                  <p className="text-2xs font-semibold text-success uppercase tracking-caps mb-1">Strengths noted</p>
                  <p className="text-xs text-ink-2">{item.signalJson.strengths_mentioned.join(', ')}</p>
                </div>
              )}
              {item.signalJson.triggers_mentioned.length > 0 && (
                <div className="p-3 bg-warning-soft rounded-md">
                  <p className="text-2xs font-semibold text-warning uppercase tracking-caps mb-1">Triggers noted</p>
                  <p className="text-xs text-ink-2">{item.signalJson.triggers_mentioned.join(', ')}</p>
                </div>
              )}
            </div>
          )}

          {/* Cards generated */}
          {item.cards.length > 0 && (
            <div>
              <p className="text-2xs font-semibold text-ink-4 uppercase tracking-caps mb-2">Plan generated</p>
              <div className="space-y-1.5">
                {item.cards.map((card) => (
                  <div key={card.id} className="flex items-center gap-2">
                    <SettingBadge setting={card.setting as never} />
                    <span className="text-xs text-ink-3">{DOMAIN_LABELS[card.domainCode as never] ?? card.domainCode}</span>
                    <span className="text-xs text-ink-2 font-medium truncate">{card.title}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export function CheckInHistory() {
  const navigate = useNavigate()
  const { activeChildId, children, activeChildId: id } = useAppStore()
  const activeChild = children.find((c) => c.id === id)
  const [history, setHistory] = useState<CheckInHistoryItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!activeChildId) { setLoading(false); return }
    getCheckinHistory(activeChildId)
      .then(setHistory)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [activeChildId])

  return (
    <div className="min-h-screen bg-paper">
      {/* Mobile header */}
      <div className="md:hidden h-14 border-b border-line bg-white flex items-center px-5 sticky top-0 z-10">
        <button onClick={() => navigate(-1)} className="text-sm text-ink-4 hover:text-ink-2 transition-colors mr-4">
          ← Back
        </button>
        <span className="font-semibold text-ink-1">Check-in history</span>
      </div>

      <div className="max-w-dashboard mx-auto px-5 md:px-8 py-6 md:py-8">
        <h2 className="font-serif text-2xl text-ink-1 mb-1">Check-in history</h2>
        <p className="text-sm text-ink-4 mb-6">
          {activeChild ? `All check-ins for ${activeChild.firstName}` : 'All past check-ins'}, newest first.
        </p>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 rounded-md skeleton" />
            ))}
          </div>
        ) : history.length === 0 ? (
          <div className="card p-8 text-center">
            <p className="text-sm text-ink-4">No check-ins yet. Complete your first check-in to see history here.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {history.map((item) => (
              <CheckInRow key={item.id} item={item} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
