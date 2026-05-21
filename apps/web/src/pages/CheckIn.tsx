import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { useAppStore } from '@/store/app'
import { submitCheckin, submitFollowup, confirmSignal } from '@/lib/api'
import { cn } from '@/lib/utils'
import type { CheckInSignal } from '@myautismguidance/shared-types'
import { DOMAIN_LABELS } from '@myautismguidance/shared-types'

type Step = 'open' | 'loading-extract' | 'followup' | 'review' | 'loading-plan' | 'done'

interface Bubble {
  type: 'app' | 'user'
  text: string
}

const OPENING_PROMPTS = [
  'How was this week? Tell me anything — the hard moments, the wins, what you noticed.',
  "What's on your mind about this week? No wrong answers.",
  'Share whatever feels most important about how the week went.',
]

export function CheckIn() {
  const navigate = useNavigate()
  const { activeChildId, setCurrentCards } = useAppStore()
  const [step, setStep] = useState<Step>('open')
  const [checkinId, setCheckinId] = useState<string | null>(null)
  const [followupQuestions, setFollowupQuestions] = useState<string[]>([])
  const [currentFollowup, setCurrentFollowup] = useState(0)
  const [signalSummary, setSignalSummary] = useState<CheckInSignal | null>(null)
  const [bubbles, setBubbles] = useState<Bubble[]>([
    { type: 'app', text: OPENING_PROMPTS[Math.floor(Math.random() * OPENING_PROMPTS.length)] },
  ])
  const [input, setInput] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [bubbles, step])

  function addBubble(b: Bubble) {
    setBubbles((prev) => [...prev, b])
  }

  async function handleSubmitMain() {
    if (!input.trim() || !activeChildId) return
    const text = input.trim()
    setInput('')
    addBubble({ type: 'user', text })
    setStep('loading-extract')

    try {
      const resp = await submitCheckin(activeChildId, text)
      setCheckinId(resp.checkin.id)

      if (resp.status === 'follow-up-needed' && resp.followupQuestions?.length) {
        setFollowupQuestions(resp.followupQuestions)
        setCurrentFollowup(0)
        setTimeout(() => {
          addBubble({ type: 'app', text: resp.followupQuestions![0] })
          setStep('followup')
        }, 500)
      } else if (resp.status === 'review' && resp.signalSummary) {
        setSignalSummary(resp.checkin.signalJson || null)
        setTimeout(() => {
          addBubble({ type: 'app', text: `Here's what I understood from your check-in. Does this look right?` })
          setStep('review')
        }, 500)
      } else {
        // Complete — go straight to loading plan
        if (resp.cards) setCurrentCards(resp.cards)
        setStep('loading-plan')
        setTimeout(() => {
          setStep('done')
          navigate('/')
        }, 3000)
      }
    } catch {
      addBubble({ type: 'app', text: "I had trouble processing that. Could you try again?" })
      setStep('open')
    }
  }

  async function handleFollowupSubmit() {
    if (!input.trim() || !checkinId) return
    const text = input.trim()
    setInput('')
    addBubble({ type: 'user', text })

    const next = currentFollowup + 1
    if (next < followupQuestions.length) {
      setTimeout(() => {
        addBubble({ type: 'app', text: followupQuestions[next] })
        setCurrentFollowup(next)
      }, 300)
    } else {
      // Submit the combined followup
      setStep('loading-extract')
      try {
        const resp = await submitFollowup(checkinId, text)
        setSignalSummary(resp.checkin.signalJson || null)
        setTimeout(() => {
          addBubble({ type: 'app', text: "Here's what I understood. Does this look right?" })
          setStep('review')
        }, 500)
      } catch {
        addBubble({ type: 'app', text: "Let's move forward with what you've shared." })
        setStep('review')
      }
    }
  }

  async function handleConfirm() {
    if (!checkinId) return
    setStep('loading-plan')
    try {
      const resp = await confirmSignal(checkinId)
      if (resp.cards) setCurrentCards(resp.cards)
    } catch {
      // navigate anyway
    }
    setTimeout(() => {
      setStep('done')
      navigate('/')
    }, 3000)
  }

  function handleKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (step === 'open') handleSubmitMain()
      else if (step === 'followup') handleFollowupSubmit()
    }
  }

  const inputActive = step === 'open' || step === 'followup'

  return (
    <div className="min-h-screen bg-paper flex flex-col">
      {/* Header */}
      <div className="h-14 border-b border-line bg-white flex items-center px-5 justify-between sticky top-0 z-10">
        <button
          onClick={() => navigate('/')}
          className="text-sm text-ink-4 hover:text-ink-2 transition-colors"
        >
          ← Back
        </button>
        <span className="font-semibold text-ink-1">Weekly check-in</span>
        <div className="w-16" />
      </div>

      <div className="flex-1 flex flex-col max-w-checkin mx-auto w-full px-5 py-5">
        {/* Bubbles */}
        <div className="flex-1 flex flex-col gap-4 mb-5">
          {bubbles.map((b, i) => (
            <div key={i} className={`flex ${b.type === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={b.type === 'app' ? 'bubble-app' : 'bubble-user'}>{b.text}</div>
            </div>
          ))}

          {/* Typing indicator */}
          {step === 'loading-extract' && (
            <div className="flex justify-start">
              <div className="bubble-app">
                <span className="inline-flex gap-1 items-center">
                  <span className="text-sm text-ink-4 mr-1">Reading your check-in</span>
                  <span className="w-1.5 h-1.5 bg-accent rounded-full animate-bounce [animation-delay:0ms]" />
                  <span className="w-1.5 h-1.5 bg-accent rounded-full animate-bounce [animation-delay:150ms]" />
                  <span className="w-1.5 h-1.5 bg-accent rounded-full animate-bounce [animation-delay:300ms]" />
                </span>
              </div>
            </div>
          )}

          {/* Signal review */}
          {step === 'review' && signalSummary && (
            <div className="animate-[fadeIn_200ms_ease-out] space-y-4">
              <div className="card p-4 space-y-3">
                <p className="text-xs font-medium text-ink-4 uppercase tracking-caps">What I understood</p>
                {signalSummary.domains_mentioned.length > 0 && (
                  <div>
                    <p className="text-xs text-ink-4 mb-1.5">Areas mentioned</p>
                    <div className="flex flex-wrap gap-1.5">
                      {signalSummary.domains_mentioned.map((d) => {
                        const dir = signalSummary.domain_direction[d] || 'unknown'
                        return (
                          <span
                            key={d}
                            className={cn(
                              'px-2 py-1 rounded-pill text-xs font-medium border',
                              dir === 'improving' ? 'border-success text-success bg-success-soft' :
                              dir === 'deteriorating' ? 'border-danger text-danger bg-danger-soft' :
                              'border-line text-ink-3'
                            )}
                          >
                            {DOMAIN_LABELS[d]} {dir === 'improving' ? '↑' : dir === 'deteriorating' ? '↓' : '→'}
                          </span>
                        )
                      })}
                    </div>
                  </div>
                )}
                {signalSummary.caregiver_tone && (
                  <div>
                    <p className="text-xs text-ink-4 mb-1">Your tone</p>
                    <span className="capitalize text-sm text-ink-2">{signalSummary.caregiver_tone}</span>
                  </div>
                )}
                {signalSummary.strengths_mentioned.length > 0 && (
                  <div>
                    <p className="text-xs text-ink-4 mb-1">Strengths noted</p>
                    <p className="text-sm text-ink-2">{signalSummary.strengths_mentioned.join(', ')}</p>
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <Button onClick={handleConfirm} className="flex-1">
                  Looks right — build my plan
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => {
                    addBubble({ type: 'app', text: "What would you like to correct?" })
                    setStep('open')
                  }}
                >
                  Clarify
                </Button>
              </div>
            </div>
          )}

          {/* Plan loading overlay */}
          {step === 'loading-plan' && (
            <div className="fixed inset-0 bg-paper flex flex-col items-center justify-center gap-5 z-50">
              <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin" />
              <div className="text-center">
                <p className="font-serif text-2xl text-ink-1">Building your plan</p>
                <p className="text-ink-4 mt-2">This takes a few seconds</p>
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input area */}
        {inputActive && (
          <div className="flex flex-col gap-2">
            <textarea
              autoFocus
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder={
                step === 'followup'
                  ? 'Your answer (or skip)...'
                  : 'Share whatever is on your mind about this week...'
              }
              rows={4}
              className="w-full rounded-md border border-line-strong bg-white px-4 py-3 text-base text-ink-2 placeholder:text-ink-4 focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 resize-none"
            />
            <div className="flex gap-2">
              {step === 'followup' && (
                <button
                  onClick={() => {
                    setInput('')
                    if (currentFollowup + 1 >= followupQuestions.length) {
                      setStep('review')
                    } else {
                      setCurrentFollowup((n) => n + 1)
                      addBubble({ type: 'app', text: followupQuestions[currentFollowup + 1] })
                    }
                  }}
                  className="text-sm text-ink-4 hover:text-ink-2 transition-colors px-3 py-2"
                >
                  Skip this
                </button>
              )}
              <Button
                className="flex-1"
                onClick={step === 'open' ? handleSubmitMain : handleFollowupSubmit}
                disabled={!input.trim()}
              >
                Send
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
