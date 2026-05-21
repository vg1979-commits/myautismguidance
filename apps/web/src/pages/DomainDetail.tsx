import { useParams, useNavigate } from 'react-router-dom'
import { DOMAIN_LABELS } from '@myautismguidance/shared-types'
import type { DomainCode } from '@myautismguidance/shared-types'
import { ThumbsUp, ThumbsDown } from 'lucide-react'

const MOCK_DOMAIN_CARDS = [
  {
    id: '1',
    title: 'Use the "calm countdown" before transitions',
    setting: 'home' as const,
    rating: 'up' as const,
    week: 'Last week',
  },
  {
    id: '2',
    title: 'First-Then board for evening routine',
    setting: 'home' as const,
    rating: null,
    week: '2 weeks ago',
  },
  {
    id: '3',
    title: 'Deep pressure breaks before homework',
    setting: 'home' as const,
    rating: 'down' as const,
    week: '3 weeks ago',
  },
]

const DOMAIN_DESCRIPTIONS: Partial<Record<DomainCode, string>> = {
  regulation: 'Emotional regulation covers your child\'s ability to manage their emotional responses to everyday situations — including transitions, frustration, sensory overload, and unexpected changes.',
  social: 'Social skills include initiating and maintaining peer interactions, reading social cues, turn-taking in conversation, and navigating unstructured social time like recess and lunch.',
  communication: 'Communication tracks expressive and receptive language, functional communication requests, conversational reciprocity, and use of AAC if applicable.',
  sensory: 'Sensory processing covers how your child responds to sensory input — tactile, auditory, visual, proprioceptive — including sensory seeking and avoiding patterns.',
  adl: 'Daily living skills (ADLs) cover age-appropriate self-care: dressing, grooming, hygiene, mealtime routines, and basic home management tasks.',
}

export function DomainDetail() {
  const { domainCode } = useParams<{ domainCode: DomainCode }>()
  const navigate = useNavigate()
  const code = domainCode as DomainCode
  const label = code ? DOMAIN_LABELS[code] : 'Domain'
  const description = code ? DOMAIN_DESCRIPTIONS[code] : ''

  return (
    <div className="min-h-screen bg-paper">
      <div className="h-14 border-b border-line bg-white flex items-center px-5 gap-3 sticky top-0 z-10">
        <button onClick={() => navigate(-1)} className="text-sm text-ink-4 hover:text-ink-2 transition-colors">
          ← Back
        </button>
        <span className="font-semibold text-ink-1">{label}</span>
      </div>

      <div className="max-w-reading mx-auto px-5 py-6 pb-10 space-y-8">
        {/* Description */}
        <section>
          <h1 className="font-serif text-3xl text-ink-1 mb-3">{label}</h1>
          {description && <p className="text-ink-3 leading-relaxed">{description}</p>}
        </section>

        {/* Check-in timeline */}
        <section>
          <h2 className="font-semibold text-ink-1 mb-3">Check-in mentions</h2>
          <div className="space-y-2">
            {[
              { week: 'This week', direction: 'improving', note: 'Fewer meltdowns overall' },
              { week: 'Last week', direction: 'stable', note: 'Transitions still hard in evenings' },
              { week: '2 weeks ago', direction: 'deteriorating', note: 'Very hard week, lots of meltdowns' },
              { week: '3 weeks ago', direction: 'stable', note: 'About the same as usual' },
            ].map(({ week, direction, note }) => (
              <div key={week} className="card px-4 py-3 flex items-center gap-4">
                <div className="flex-shrink-0 w-2 h-2 rounded-full bg-line" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-ink-4">{week}</span>
                    <span className={`text-sm font-medium ${
                      direction === 'improving' ? 'text-success' :
                      direction === 'deteriorating' ? 'text-danger' : 'text-ink-4'
                    }`}>
                      {direction === 'improving' ? '↑' : direction === 'deteriorating' ? '↓' : '→'}
                    </span>
                  </div>
                  <p className="text-sm text-ink-2 mt-0.5">{note}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Past cards */}
        <section>
          <h2 className="font-semibold text-ink-1 mb-3">Cards for this area</h2>
          <div className="space-y-3">
            {MOCK_DOMAIN_CARDS.map((c) => (
              <button
                key={c.id}
                onClick={() => navigate(`/cards/${c.id}`)}
                className="card w-full text-left p-4 hover:shadow-md transition-shadow duration-2"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-sm text-ink-1">{c.title}</p>
                    <p className="text-xs text-ink-4 mt-0.5">{c.week}</p>
                  </div>
                  {c.rating === 'up' && <ThumbsUp size={16} className="text-success flex-shrink-0" />}
                  {c.rating === 'down' && <ThumbsDown size={16} className="text-danger flex-shrink-0" />}
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* IEP section */}
        <section>
          <h2 className="font-semibold text-ink-1 mb-3">IEP connection</h2>
          <div className="card p-5 space-y-3">
            <div>
              <p className="text-xs text-ink-4 uppercase tracking-caps mb-1">Current IEP goal</p>
              <p className="text-sm text-ink-2">
                Student will use self-regulation strategies independently in 3 out of 5 opportunities as measured by teacher observation.
              </p>
            </div>
            <div>
              <p className="text-xs text-ink-4 uppercase tracking-caps mb-1">SMART goal draft (based on your data)</p>
              <p className="text-sm text-ink-2 italic">
                By the next IEP meeting, [child] will independently use a countdown strategy during 4 out of 5 daily transitions at home, as measured by caregiver log over 4 consecutive weeks.
              </p>
            </div>
            <div className="bg-warning-soft border border-warning/20 rounded-md p-3">
              <p className="text-xs font-medium text-warning">IEP meeting in 45 days</p>
              <p className="text-xs text-ink-3 mt-0.5">Consider generating an IEP advocacy document in the Share tab.</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
