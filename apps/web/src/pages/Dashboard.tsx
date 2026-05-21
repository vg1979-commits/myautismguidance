import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useUser } from '@clerk/clerk-react'
import { ThumbsUp, ThumbsDown, ChevronDown, ChevronUp, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { SettingBadge } from '@/components/ui/Badge'
import { CardSkeleton } from '@/components/ui/Skeleton'
import { useAppStore } from '@/store/app'
import { getCurrentCards, rateCard, getCurrentCheckin } from '@/lib/api'
import { cn, trendIcon, trendColor } from '@/lib/utils'
import { DOMAIN_LABELS } from '@myautismguidance/shared-types'
import type { ActionCard } from '@myautismguidance/shared-types'

const MOCK_CARDS: ActionCard[] = [
  {
    id: '1',
    childId: 'c1',
    checkinId: 'ci1',
    slotType: 'home-strategy',
    domainCode: 'regulation',
    setting: 'home',
    title: 'Use the "calm countdown" before transitions',
    strategyText:
      "Five minutes before any transition (dinner, leaving, screens off), give a verbal countdown. This reduces the surprise that triggers dysregulation at transitions.",
    scriptText:
      '"Five more minutes, then we\'re getting ready for dinner. I\'ll give you a heads up when it\'s time."',
    watchForPositive: ['Smoother transitions with less protest', 'Child starts preparing on their own'],
    watchForNegative: ['Still melting down — try 10-minute warning instead'],
    whyNow: "You mentioned transitions are a big source of meltdowns this week. This strategy directly targets surprise-triggered dysregulation.",
    generatedAt: new Date().toISOString(),
  },
  {
    id: '2',
    childId: 'c1',
    checkinId: 'ci1',
    slotType: 'school-request',
    domainCode: 'social',
    setting: 'school',
    title: 'Request a lunch buddy program',
    strategyText:
      "Ask the teacher to pair your child with a patient peer during unstructured lunch time. A structured social opportunity reduces the anxiety of open social situations.",
    scriptText:
      '"Could we try pairing [child] with a lunch buddy for the next two weeks? Even once or twice would help."',
    watchForPositive: ['Mentions lunch by name', 'Asks about the friend'],
    watchForNegative: ['Still avoiding the cafeteria — escalate to school counselor'],
    whyNow: "You said lunch is hard and your child seems isolated. A lunch buddy is low-stakes and teacher-manageable.",
    generatedAt: new Date().toISOString(),
  },
  {
    id: '3',
    childId: 'c1',
    checkinId: 'ci1',
    slotType: 'strength',
    domainCode: 'communication',
    setting: 'home',
    title: 'Celebrate the detailed conversations',
    strategyText:
      "Your child's ability to talk in depth about topics they love is a genuine strength. Use these conversations intentionally — they're practicing turn-taking, sustained attention, and social reciprocity.",
    scriptText: '"Tell me more about that. What happened next?" (and mean it)',
    watchForPositive: ['Longer conversations', 'Initiates topics more often'],
    watchForNegative: [],
    whyNow: "You noted your child loves Minecraft and will talk about it at length. This is working communication — build on it.",
    generatedAt: new Date().toISOString(),
  },
]

const MOCK_TREND = [
  { domain: 'regulation' as const, direction: 'improving' as const },
  { domain: 'social' as const, direction: 'stable' as const },
  { domain: 'communication' as const, direction: 'improving' as const },
  { domain: 'sensory' as const, direction: 'deteriorating' as const },
]

function ActionCardItem({ card }: { card: ActionCard }) {
  const [expanded, setExpanded] = useState(false)
  const [rated, setRated] = useState<'up' | 'down' | null>(card.rating || null)
  const [ratingLoading, setRatingLoading] = useState(false)

  async function handleRate(r: 'up' | 'down') {
    if (ratingLoading) return
    setRatingLoading(true)
    setRated(r) // optimistic
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

      {/* Expandable sections */}
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

export function Dashboard() {
  const { user } = useUser()
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
        setCurrentCards(cards.length > 0 ? cards : MOCK_CARDS)
        setCheckinDone(!!checkin)
      } catch {
        setCurrentCards(MOCK_CARDS)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [activeChildId])

  const cards = currentCards.length > 0 ? currentCards : MOCK_CARDS
  const now = new Date()
  const weekStart = new Date(now)
  weekStart.setDate(now.getDate() - now.getDay())
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekStart.getDate() + 6)
  const fmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  const weekRange = `${fmt(weekStart)} – ${fmt(weekEnd)}`

  return (
    <div className="min-h-screen bg-paper">
      {/* Top header (mobile) */}
      <div className="md:hidden h-14 border-b border-line bg-white flex items-center px-5 justify-between sticky top-0 z-10">
        <span className="font-serif text-lg text-ink-1">myautismguidance</span>
        {activeChild && (
          <div className="w-8 h-8 rounded-pill bg-accent-soft flex items-center justify-center text-accent font-semibold text-sm">
            {activeChild.firstName[0]}
          </div>
        )}
      </div>

      <div className="max-w-dashboard mx-auto px-5 md:px-8 py-6 md:py-8">
        {/* Check-in banner */}
        {!checkinDone && (
          <div className="bg-accent-soft border border-accent/20 rounded-md p-4 mb-6 flex items-center justify-between gap-4">
            <div>
              <p className="font-medium text-accent">
                {childName}'s weekly check-in is ready
              </p>
              <p className="text-sm text-ink-3 mt-0.5">How was this week?</p>
            </div>
            <Button
              size="sm"
              onClick={() => navigate('/checkin')}
              className="flex-shrink-0"
            >
              Check in <ArrowRight size={14} />
            </Button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6">
          {/* Left: Card feed */}
          <div>
            <h2 className="font-serif text-2xl text-ink-1 mb-1">This week's plan</h2>
            <p className="text-sm text-ink-4 mb-5">{weekRange}</p>

            <div className="space-y-4">
              {loading
                ? Array.from({ length: 3 }).map((_, i) => <CardSkeleton key={i} />)
                : cards.map((card) => <ActionCardItem key={card.id} card={card} />)}
            </div>
          </div>

          {/* Right: Summary panel (desktop) */}
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
                      {activeChild.schoolSetting?.replace(/-/g, ' ')}
                    </p>
                  </div>
                </div>

                {/* Trend strip */}
                <div className="space-y-2">
                  <p className="text-xs font-medium text-ink-4 uppercase tracking-caps">Current trends</p>
                  {MOCK_TREND.map(({ domain, direction }) => (
                    <div key={domain} className="flex items-center justify-between">
                      <span className="text-sm text-ink-3">{DOMAIN_LABELS[domain]}</span>
                      <span className={cn('text-sm font-medium', trendColor(direction))}>
                        {trendIcon(direction)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="card p-5 space-y-3">
              <Button variant="secondary" className="w-full" onClick={() => navigate('/share')}>
                Share with school or therapist
              </Button>
              <Button variant="ghost" className="w-full" onClick={() => navigate('/progress')}>
                View progress
              </Button>
            </div>

            <div className="p-4 bg-paper-2 rounded-md border border-line">
              <p className="text-xs text-ink-4 leading-relaxed">
                These cards are based on what you shared in your check-in. Rate them after trying
                so the plan gets more accurate over time.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
