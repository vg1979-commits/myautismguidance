import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ThumbsUp, ThumbsDown, ChevronDown, ChevronUp, ArrowRight, MessageSquare } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { SettingBadge } from '@/components/ui/Badge'
import { CardSkeleton } from '@/components/ui/Skeleton'
import { useAppStore } from '@/store/app'
import { getCurrentCards, rateCard, getCurrentCheckin } from '@/lib/api'
import { cn, trendIcon, trendColor } from '@/lib/utils'
import { DOMAIN_LABELS } from '@myautismguidance/shared-types'
import type { ActionCard } from '@myautismguidance/shared-types'

function ActionCardItem({ card }: { card: ActionCard }) {
  const [expanded, setExpanded] = useState(false)
  const [rated, setRated] = useState<'up' | 'down' | null>(card.rating || null)
  const [ratingLoading, setRatingLoading] = useState(false)

  async function handleRate(r: 'up' | 'down') {
    if (ratingLoading) return
    setRatingLoading(true)
    setRated(r)
    try {
      await rateCard(card.id, r)
    } catch {
      setRated(null)
    } finally {
      setRatingLoading(false)
    }
  }

  return (
    <div className="card p-5 animate-[fadeIn_200ms_ease-out]">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <SettingBadge setting={card.setting} />
          <span className="text-xs text-ink-4">{DOMAIN_LABELS[card.domainCode]}</span>
        </div>
      </div>

      <h3 className="font-semibold text-ink-1 mb-2">{card.title}</h3>
      <p className="text-sm text-ink-3 leading-relaxed mb-4">{card.strategyText}</p>

      {expanded && (
        <div className="space-y-3 mb-4 animate-[fadeIn_200ms_ease-out]">
          <div className="bg-accent-soft rounded-md p-4">
            <p className="text-xs font-medium text-accent uppercase tracking-caps mb-2">Try this script</p>
            <p className="text-sm text-ink-2 italic">"{card.scriptText}"</p>
          </div>

          {card.watchForPositive.length > 0 && (
            <div className="p-4 bg-success-soft rounded-md">
              <p className="text-xs font-medium text-success uppercase tracking-caps mb-2">Signs it's working</p>
              <ul className="space-y-1">
                {card.watchForPositive.map((s, i) => (
                  <li key={i} className="text-sm text-ink-2 flex gap-2">
                    <span className="text-success">✓</span>{s}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {card.watchForNegative.length > 0 && (
            <div className="p-4 bg-warning-soft rounded-md">
              <p className="text-xs font-medium text-warning uppercase tracking-caps mb-2">Signs to try something else</p>
              <ul className="space-y-1">
                {card.watchForNegative.map((s, i) => (
                  <li key={i} className="text-sm text-ink-2 flex gap-2">
                    <span className="text-warning">!</span>{s}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="p-4 bg-paper-2 rounded-md border border-line">
            <p className="text-xs font-medium text-ink-4 uppercase tracking-caps mb-1">Why this?</p>
            <p className="text-sm text-ink-3">{card.whyNow}</p>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 text-sm text-accent hover:text-accent-hover transition-colors font-medium"
        >
          {expanded ? (
            <><ChevronUp size={14} /> Show less</>
          ) : (
            <><ChevronDown size={14} /> Script + details</>
          )}
        </button>

        <div className="flex items-center gap-2">
          <Link
            to={`/cards/${card.id}`}
            className="text-xs text-ink-4 hover:text-ink-2 no-underline transition-colors"
          >
            Full view
          </Link>
          <div className="flex items-center gap-1">
            <button
              onClick={() => handleRate('up')}
              className={cn(
                'p-1.5 rounded-sm transition-colors duration-1',
                rated === 'up' ? 'text-success bg-success-soft' : 'text-ink-4 hover:text-success hover:bg-success-soft'
              )}
            >
              <ThumbsUp size={16} />
            </button>
            <button
              onClick={() => handleRate('down')}
              className={cn(
                'p-1.5 rounded-sm transition-colors duration-1',
                rated === 'down' ? 'text-danger bg-danger-soft' : 'text-ink-4 hover:text-danger hover:bg-danger-soft'
              )}
            >
              <ThumbsDown size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function EmptyState({ childName, navigate }: { childName: string; navigate: (path: string) => void }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-5">
      <div className="w-14 h-14 rounded-pill bg-accent-soft flex items-center justify-center mb-4">
        <MessageSquare size={24} strokeWidth={1.5} className="text-accent" />
      </div>
      <h3 className="font-semibold text-ink-1 mb-2">No plan yet this week</h3>
      <p className="text-sm text-ink-3 max-w-[320px] mb-6 leading-relaxed">
        Do your first check-in to tell us how {childName}'s week went. You'll get a personalized
        plan — 3 to 5 specific things to try — in about 30 seconds.
      </p>
      <Button onClick={() => navigate('/checkin')}>
        Start check-in <ArrowRight size={14} />
      </Button>
    </div>
  )
}

export function Dashboard() {
  const navigate = useNavigate()
  const { activeChildId, children, currentCards, setCurrentCards } = useAppStore()
  const activeChild = children.find((c) => c.id === activeChildId)
  const [loading, setLoading] = useState(true)
  const [checkinDone, setCheckinDone] = useState(false)
  const childName = activeChild?.firstName || 'your child'

  useEffect(() => {
    async function load() {
      if (!activeChildId) {
        setLoading(false)
        return
      }
      try {
        const [cards, checkin] = await Promise.all([
          getCurrentCards(activeChildId),
          getCurrentCheckin(activeChildId),
        ])
        // Only show real cards — no mock data
        setCurrentCards(cards)
        setCheckinDone(!!checkin)
      } catch {
        // API unreachable — show empty state, not mock data
        setCurrentCards([])
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [activeChildId])

  const now = new Date()
  const weekStart = new Date(now)
  weekStart.setDate(now.getDate() - now.getDay())
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekStart.getDate() + 6)
  const fmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  const weekRange = `${fmt(weekStart)} – ${fmt(weekEnd)}`

  return (
    <div className="min-h-screen bg-paper">
      {/* Mobile header */}
      <div className="md:hidden h-14 border-b border-line bg-white flex items-center px-5 justify-between sticky top-0 z-10">
        <span className="font-serif text-lg text-ink-1">myautismguidance</span>
        {activeChild && (
          <div className="w-8 h-8 rounded-pill bg-accent-soft flex items-center justify-center text-accent font-semibold text-sm">
            {activeChild.firstName[0]}
          </div>
        )}
      </div>

      <div className="max-w-dashboard mx-auto px-5 md:px-8 py-6 md:py-8">
        {/* Check-in banner — only shows if check-in not yet done and there are existing cards from previous weeks */}
        {!checkinDone && currentCards.length > 0 && (
          <div className="bg-accent-soft border border-accent/20 rounded-md p-4 mb-6 flex items-center justify-between gap-4">
            <div>
              <p className="font-medium text-accent">
                {childName}'s weekly check-in is ready
              </p>
              <p className="text-sm text-ink-3 mt-0.5">How was this week?</p>
            </div>
            <Button size="sm" onClick={() => navigate('/checkin')} className="flex-shrink-0">
              Check in <ArrowRight size={14} />
            </Button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6">
          {/* Left: Card feed */}
          <div>
            <h2 className="font-serif text-2xl text-ink-1 mb-1">This week's plan</h2>
            <p className="text-sm text-ink-4 mb-5">{weekRange}</p>

            {loading ? (
              <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, i) => <CardSkeleton key={i} />)}
              </div>
            ) : currentCards.length > 0 ? (
              <div className="space-y-4">
                {currentCards.map((card) => <ActionCardItem key={card.id} card={card} />)}
              </div>
            ) : (
              <EmptyState childName={childName} navigate={navigate} />
            )}
          </div>

          {/* Right: Summary panel (desktop only) */}
          <div className="hidden lg:flex flex-col gap-5">
            {activeChild && (
              <div className="card p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-pill bg-accent flex items-center justify-center text-white font-semibold">
                    {activeChild.firstName[0]}
                  </div>
                  <div>
                    <p className="font-semibold text-ink-1">{activeChild.firstName}</p>
                    <p className="text-xs text-ink-4">
                      {activeChild.schoolSetting?.replace(/-/g, ' ') || 'Profile set up'}
                    </p>
                  </div>
                </div>

                {currentCards.length === 0 ? (
                  <div className="text-center py-2">
                    <p className="text-sm text-ink-4">
                      Complete your first check-in to see trends here.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-ink-4 uppercase tracking-caps">This week</p>
                    <p className="text-sm text-ink-3">{currentCards.length} cards in your plan</p>
                  </div>
                )}
              </div>
            )}

            <div className="card p-5 space-y-3">
              <Button
                variant="primary"
                className="w-full"
                onClick={() => navigate('/checkin')}
              >
                <MessageSquare size={14} /> {checkinDone ? 'Update check-in' : 'Start check-in'}
              </Button>
              <Button variant="secondary" className="w-full" onClick={() => navigate('/share')}>
                Share with school or therapist
              </Button>
              <Button variant="ghost" className="w-full" onClick={() => navigate('/progress')}>
                View progress
              </Button>
            </div>

            <div className="p-4 bg-paper-2 rounded-md border border-line">
              <p className="text-xs text-ink-4 leading-relaxed">
                Cards are generated from your check-in. Rate them after trying so the plan
                gets more accurate over time.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
