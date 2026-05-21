import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { useAppStore } from '@/store/app'
import { createChild } from '@/lib/api'

const questions = [
  {
    key: 'firstName',
    question: "What's your child's first name?",
    placeholder: 'First name only is fine',
    type: 'text',
  },
  {
    key: 'role',
    question: 'And what should I call you?',
    placeholder: 'Your first name',
    type: 'text',
  },
]

interface Bubble {
  type: 'app' | 'user'
  text: string
}

export function OnboardingWelcome() {
  const navigate = useNavigate()
  const { mergeOnboardingData, onboardingData, addChild, setActiveChildId } = useAppStore()

  const [bubbles, setBubbles] = useState<Bubble[]>([
    { type: 'app', text: questions[0].question },
  ])
  const [currentQ, setCurrentQ] = useState(0)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)

  const childName = onboardingData.firstName as string | undefined

  function advance(value: string) {
    const q = questions[currentQ]
    mergeOnboardingData({ [q.key]: value })

    setBubbles((prev) => [
      ...prev,
      { type: 'user', text: value },
    ])

    const next = currentQ + 1
    if (next < questions.length) {
      setTimeout(() => {
        setBubbles((prev) => [
          ...prev,
          { type: 'app', text: questions[next].question },
        ])
        setCurrentQ(next)
        setInput('')
      }, 300)
    } else {
      // Done — move to baseline
      setTimeout(() => {
        setBubbles((prev) => [
          ...prev,
          {
            type: 'app',
            text: `Great. I'll ask you a few more things about ${value || childName || 'your child'} so I can give you a plan that actually fits. This takes about 10 minutes.`,
          },
        ])
      }, 300)
      setTimeout(() => proceed(value), 1800)
    }
  }

  async function proceed(caregiverName: string) {
    setLoading(true)
    try {
      const child = await createChild({
        firstName: onboardingData.firstName as string,
        language: 'en',
        specialInterests: [],
        diagnosisConfirmed: false,
        diagnosisStatus: 'suspected',
      })
      addChild(child)
      setActiveChildId(child.id)
      mergeOnboardingData({ caregiverName, childId: child.id })
      navigate('/onboarding/baseline')
    } catch {
      // Still navigate even if API fails (demo mode)
      navigate('/onboarding/baseline')
    } finally {
      setLoading(false)
    }
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && input.trim()) {
      advance(input.trim())
    }
  }

  return (
    <div className="min-h-screen bg-paper flex flex-col">
      {/* Progress */}
      <div className="h-1 bg-line">
        <div className="h-1 bg-accent transition-all duration-3" style={{ width: '20%' }} />
      </div>

      <div className="flex-1 flex flex-col max-w-checkin mx-auto w-full px-5 py-8">
        {/* Header */}
        <div className="mb-8">
          <span className="font-serif text-xl text-ink-1">myautismguidance</span>
          <p className="text-sm text-ink-4 mt-1">Step 1 of 5 — Getting started</p>
        </div>

        {/* Chat bubbles */}
        <div className="flex-1 flex flex-col gap-4 mb-6">
          {bubbles.map((b, i) => (
            <div key={i} className={`flex ${b.type === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={b.type === 'app' ? 'bubble-app' : 'bubble-user'}>{b.text}</div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bubble-app">
                <span className="inline-flex gap-1">
                  <span className="w-1.5 h-1.5 bg-accent rounded-full animate-bounce [animation-delay:0ms]" />
                  <span className="w-1.5 h-1.5 bg-accent rounded-full animate-bounce [animation-delay:150ms]" />
                  <span className="w-1.5 h-1.5 bg-accent rounded-full animate-bounce [animation-delay:300ms]" />
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        {!loading && currentQ < questions.length && (
          <div className="flex gap-3">
            <input
              autoFocus
              type={questions[currentQ].type}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder={questions[currentQ].placeholder}
              className="flex-1 rounded-sm border border-line-strong bg-white px-4 py-3 text-base text-ink-2 placeholder:text-ink-4 focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-colors"
            />
            <Button onClick={() => input.trim() && advance(input.trim())} disabled={!input.trim()}>
              Next
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
