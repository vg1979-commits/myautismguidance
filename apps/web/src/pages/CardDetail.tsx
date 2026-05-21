import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ThumbsUp, ThumbsDown, Bookmark, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { SettingBadge } from '@/components/ui/Badge'
import { Skeleton } from '@/components/ui/Skeleton'
import { getCard, rateCard } from '@/lib/api'
import { cn } from '@/lib/utils'
import { DOMAIN_LABELS } from '@myautismguidance/shared-types'
import type { ActionCard } from '@myautismguidance/shared-types'

export function CardDetail() {
  const { cardId } = useParams()
  const navigate = useNavigate()
  const [card, setCard] = useState<ActionCard | null>(null)
  const [loading, setLoading] = useState(true)
  const [rated, setRated] = useState<'up' | 'down' | null>(null)
  const [ratingNote, setRatingNote] = useState('')
  const [showNoteInput, setShowNoteInput] = useState(false)
  const [scriptOpen, setScriptOpen] = useState(true)
  const [watchOpen, setWatchOpen] = useState(false)
  const [whyOpen, setWhyOpen] = useState(false)

  useEffect(() => {
    if (!cardId) return
    getCard(cardId)
      .then((c) => {
        setCard(c)
        setRated(c.rating || null)
      })
      .catch(() => {
        // Use mock card
        setCard({
          id: cardId,
          childId: 'c1',
          checkinId: 'ci1',
          slotType: 'home-strategy',
          domainCode: 'regulation',
          setting: 'home',
          title: 'Use the "calm countdown" before transitions',
          strategyText: "Five minutes before any transition (dinner, leaving, screens off), give a verbal countdown. This reduces the surprise that triggers dysregulation at transitions.",
          scriptText: '"Five more minutes, then we\'re getting ready for dinner. I\'ll give you a heads up when it\'s time."',
          watchForPositive: ['Smoother transitions with less protest', 'Child starts preparing on their own'],
          watchForNegative: ['Still melting down — try 10-minute warning instead'],
          whyNow: "You mentioned transitions are a big source of meltdowns this week.",
          generatedAt: new Date().toISOString(),
        })
      })
      .finally(() => setLoading(false))
  }, [cardId])

  async function handleRate(r: 'up' | 'down') {
    if (!card) return
    setRated(r)
    if (r === 'down') setShowNoteInput(true)
    try {
      await rateCard(card.id, r)
    } catch {
      setRated(null)
    }
  }

  if (loading) {
    return (
      <div className="max-w-card mx-auto px-5 py-8 space-y-4">
        <Skeleton className="h-6 w-24" />
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-24 w-full" />
      </div>
    )
  }

  if (!card) return null

  return (
    <div className="min-h-screen bg-paper">
      <div className="h-14 border-b border-line bg-white flex items-center px-5 justify-between sticky top-0 z-10">
        <button onClick={() => navigate(-1)} className="text-sm text-ink-4 hover:text-ink-2 transition-colors">
          ← Back
        </button>
        <span className="text-sm font-medium text-ink-3">Action card</span>
        <button className="text-ink-4 hover:text-ink-2 transition-colors p-1">
          <Bookmark size={18} strokeWidth={1.5} />
        </button>
      </div>

      <div className="max-w-card mx-auto px-5 py-6 pb-10">
        <div className="flex items-center gap-2 mb-4">
          <SettingBadge setting={card.setting} />
          <span className="text-sm text-ink-4">{DOMAIN_LABELS[card.domainCode]}</span>
        </div>

        <h1 className="font-serif text-3xl text-ink-1 mb-4 leading-tight">{card.title}</h1>
        <p className="text-ink-3 leading-relaxed mb-6">{card.strategyText}</p>

        {/* Script accordion */}
        <div className="card mb-3">
          <button
            onClick={() => setScriptOpen(!scriptOpen)}
            className="w-full flex items-center justify-between p-4 text-left"
          >
            <span className="font-semibold text-ink-1 text-sm">Try this script</span>
            <ChevronDown
              size={16}
              className={cn('text-ink-4 transition-transform duration-2', scriptOpen && 'rotate-180')}
            />
          </button>
          {scriptOpen && (
            <div className="px-4 pb-4 animate-[fadeIn_150ms_ease-out]">
              <div className="bg-accent-soft rounded-md p-4">
                <p className="text-ink-2 italic leading-relaxed">"{card.scriptText}"</p>
              </div>
            </div>
          )}
        </div>

        {/* Watch for accordion */}
        <div className="card mb-3">
          <button
            onClick={() => setWatchOpen(!watchOpen)}
            className="w-full flex items-center justify-between p-4 text-left"
          >
            <span className="font-semibold text-ink-1 text-sm">What to watch for</span>
            <ChevronDown
              size={16}
              className={cn('text-ink-4 transition-transform duration-2', watchOpen && 'rotate-180')}
            />
          </button>
          {watchOpen && (
            <div className="px-4 pb-4 space-y-3 animate-[fadeIn_150ms_ease-out]">
              {card.watchForPositive.length > 0 && (
                <div className="bg-success-soft rounded-md p-3">
                  <p className="text-xs font-medium text-success uppercase tracking-caps mb-2">Signs it's working</p>
                  <ul className="space-y-1">
                    {card.watchForPositive.map((s, i) => (
                      <li key={i} className="flex gap-2 text-sm text-ink-2">
                        <span className="text-success">✓</span>{s}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {card.watchForNegative.length > 0 && (
                <div className="bg-warning-soft rounded-md p-3">
                  <p className="text-xs font-medium text-warning uppercase tracking-caps mb-2">Signs to try something else</p>
                  <ul className="space-y-1">
                    {card.watchForNegative.map((s, i) => (
                      <li key={i} className="flex gap-2 text-sm text-ink-2">
                        <span className="text-warning">!</span>{s}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Why this accordion */}
        <div className="card mb-6">
          <button
            onClick={() => setWhyOpen(!whyOpen)}
            className="w-full flex items-center justify-between p-4 text-left"
          >
            <span className="font-semibold text-ink-1 text-sm">Why this?</span>
            <ChevronDown
              size={16}
              className={cn('text-ink-4 transition-transform duration-2', whyOpen && 'rotate-180')}
            />
          </button>
          {whyOpen && (
            <div className="px-4 pb-4 animate-[fadeIn_150ms_ease-out]">
              <p className="text-sm text-ink-3 leading-relaxed">{card.whyNow}</p>
            </div>
          )}
        </div>

        {/* Rating */}
        <div className="card p-5">
          <p className="font-semibold text-ink-1 mb-4">How did this go?</p>
          <div className="flex gap-3 mb-4">
            <button
              onClick={() => handleRate('up')}
              className={cn(
                'flex-1 flex items-center justify-center gap-2 py-3 rounded-md border transition-colors duration-2 font-medium text-sm',
                rated === 'up'
                  ? 'bg-success-soft border-success text-success'
                  : 'border-line text-ink-3 hover:border-success hover:bg-success-soft hover:text-success'
              )}
            >
              <ThumbsUp size={16} /> Worked well
            </button>
            <button
              onClick={() => handleRate('down')}
              className={cn(
                'flex-1 flex items-center justify-center gap-2 py-3 rounded-md border transition-colors duration-2 font-medium text-sm',
                rated === 'down'
                  ? 'bg-danger-soft border-danger text-danger'
                  : 'border-line text-ink-3 hover:border-danger hover:bg-danger-soft hover:text-danger'
              )}
            >
              <ThumbsDown size={16} /> Didn't help
            </button>
          </div>

          {showNoteInput && (
            <div className="space-y-3 animate-[fadeIn_150ms_ease-out]">
              <textarea
                value={ratingNote}
                onChange={(e) => setRatingNote(e.target.value)}
                placeholder="Optional: what happened? This helps the engine learn."
                rows={3}
                className="w-full rounded-sm border border-line-strong bg-white px-3 py-2 text-sm text-ink-2 placeholder:text-ink-4 focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 resize-none"
              />
              <p className="text-xs text-ink-4">Want an alternative for this week?</p>
              <Button variant="secondary" className="w-full">See alternative</Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
