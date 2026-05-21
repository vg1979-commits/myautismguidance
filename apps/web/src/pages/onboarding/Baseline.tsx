import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { useAppStore } from '@/store/app'
import { saveBaseline, updateChild } from '@/lib/api'
import type { DomainCode, DiagnosisStatus, SchoolSetting } from '@myautismguidance/shared-types'

type Step = 2 | 3 | 4 | 5

interface StepConfig {
  step: Step
  title: string
  description: string
}

const STEPS: StepConfig[] = [
  { step: 2, title: 'About your child', description: 'Step 2 of 5' },
  { step: 3, title: 'Existing plans', description: 'Step 3 of 5' },
  { step: 4, title: 'Domain profile', description: 'Step 4 of 5' },
  { step: 5, title: 'Current goals', description: 'Step 5 of 5' },
]

const DOMAIN_QUESTIONS: { code: DomainCode; label: string; question: string }[] = [
  { code: 'communication', label: 'Communication', question: 'How is communication going?' },
  { code: 'regulation', label: 'Emotional regulation', question: 'How is emotional regulation?' },
  { code: 'social', label: 'Social skills', question: 'How are social skills?' },
  { code: 'sensory', label: 'Sensory processing', question: 'How is sensory processing?' },
  { code: 'adl', label: 'Daily living skills', question: 'How are daily living skills (dressing, hygiene, etc.)?' },
]

const LEVEL_LABELS = ['Emerging — needs a lot of support', 'Developing — making some progress', 'Established — mostly independent', 'Strong — ready for next steps']

export function OnboardingBaseline() {
  const navigate = useNavigate()
  const { onboardingData, mergeOnboardingData, activeChildId } = useAppStore()
  const childName = (onboardingData.firstName as string) || 'your child'

  const [currentStep, setCurrentStep] = useState<Step>(2)
  const [loading, setLoading] = useState(false)

  // Step 2 state
  const [dob, setDob] = useState('')
  const [diagnosisStatus, setDiagnosisStatus] = useState<DiagnosisStatus>('suspected')
  const [schoolSettings, setSchoolSettings] = useState<SchoolSetting[]>([])

  // Step 3 state
  const [plansStatus, setPlansStatus] = useState<'fresh' | 'existing' | 'informal' | null>(null)

  // Step 4 state
  const [domainLevels, setDomainLevels] = useState<Partial<Record<DomainCode, number>>>({})

  // Step 5 state
  const [goals, setGoals] = useState('')
  const [hasntWorked, setHasntWorked] = useState('')
  const [interests, setInterests] = useState('')

  const progress = ((currentStep - 1) / 5) * 100

  function toggleSchoolSetting(s: SchoolSetting) {
    setSchoolSettings((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
    )
  }

  async function finish() {
    if (!activeChildId) return
    setLoading(true)
    try {
      await updateChild(activeChildId, {
        dob,
        diagnosisStatus,
        schoolSetting: schoolSettings[0],
        specialInterests: interests.split(',').map((s) => s.trim()).filter(Boolean),
      })
      await saveBaseline(activeChildId, {
        domainProfile: Object.entries(domainLevels).map(([code, level]) => ({
          domainCode: code as DomainCode,
          level: (level + 1) as 1 | 2 | 3 | 4,
        })),
        currentGoals: goals.split('\n').filter(Boolean),
        whatHasntWorked: hasntWorked.split('\n').filter(Boolean),
      })
    } catch {
      // continue anyway
    } finally {
      setLoading(false)
    }

    if (plansStatus === 'existing') {
      navigate('/onboarding/iep-upload')
    } else {
      navigate('/')
    }
  }

  const schoolSettingOptions: { value: SchoolSetting; label: string }[] = [
    { value: 'general-ed', label: 'General education' },
    { value: 'resource-room', label: 'Resource room / pull-out support' },
    { value: 'self-contained', label: 'Self-contained classroom' },
    { value: 'therapeutic-day', label: 'Therapeutic day school' },
    { value: 'home-school', label: 'Home school' },
    { value: 'not-in-school', label: 'Not in school yet' },
  ]

  return (
    <div className="min-h-screen bg-paper flex flex-col">
      {/* Progress */}
      <div className="h-1 bg-line">
        <div
          className="h-1 bg-accent transition-all duration-3"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="flex-1 max-w-checkin mx-auto w-full px-5 py-8">
        <div className="mb-8">
          <span className="font-serif text-xl text-ink-1">myautismguidance</span>
          <p className="text-sm text-ink-4 mt-1">
            {STEPS.find((s) => s.step === currentStep)?.description} —{' '}
            {STEPS.find((s) => s.step === currentStep)?.title}
          </p>
        </div>

        {/* Step 2 — Child basics */}
        {currentStep === 2 && (
          <div className="space-y-6 animate-[fadeIn_200ms_ease-out]">
            <div className="bubble-app">Tell me a bit more about {childName}.</div>

            <div>
              <label className="text-sm font-medium text-ink-2 block mb-2">Date of birth</label>
              <input
                type="date"
                value={dob}
                onChange={(e) => setDob(e.target.value)}
                className="w-full rounded-sm border border-line-strong bg-white px-3 py-2 text-base text-ink-2 focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-ink-2 block mb-2">Diagnosis status</label>
              <div className="flex flex-col gap-2">
                {[
                  { value: 'confirmed', label: 'Confirmed ASD diagnosis' },
                  { value: 'suspected', label: 'Suspected — in the process' },
                  { value: 'seeking-evaluation', label: 'Seeking an evaluation' },
                ].map(({ value, label }) => (
                  <label key={value} className="flex items-center gap-3 cursor-pointer p-3 rounded-md border border-line hover:bg-paper-2 transition-colors">
                    <input
                      type="radio"
                      name="diagnosis"
                      value={value}
                      checked={diagnosisStatus === value}
                      onChange={() => setDiagnosisStatus(value as DiagnosisStatus)}
                      className="accent-accent"
                    />
                    <span className="text-sm text-ink-2">{label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-ink-2 block mb-2">School setting (select all that apply)</label>
              <div className="flex flex-wrap gap-2">
                {schoolSettingOptions.map(({ value, label }) => (
                  <button
                    key={value}
                    onClick={() => toggleSchoolSetting(value)}
                    className={`px-3 py-1.5 rounded-pill text-sm border transition-colors duration-1 ${
                      schoolSettings.includes(value)
                        ? 'bg-accent text-white border-accent'
                        : 'bg-white text-ink-3 border-line-strong hover:bg-paper-2'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <Button onClick={() => setCurrentStep(3)} className="w-full">
              Continue
            </Button>
          </div>
        )}

        {/* Step 3 — Existing plans */}
        {currentStep === 3 && (
          <div className="space-y-5 animate-[fadeIn_200ms_ease-out]">
            <div className="bubble-app">
              Does {childName} already have active plans — like an IEP, a behavior support plan, or therapy goals?
            </div>

            <div className="flex flex-col gap-3">
              {[
                { value: 'existing', label: 'Yes — I have an IEP or formal plan', desc: 'I can help you upload it or describe it.' },
                { value: 'informal', label: 'Sort of — some informal things', desc: 'We can capture what you already know.' },
                { value: 'fresh', label: 'Starting fresh', desc: 'We\'ll build the baseline together.' },
              ].map(({ value, label, desc }) => (
                <button
                  key={value}
                  onClick={() => setPlansStatus(value as 'fresh' | 'existing' | 'informal')}
                  className={`text-left p-4 rounded-md border transition-colors duration-1 ${
                    plansStatus === value
                      ? 'border-accent bg-accent-soft'
                      : 'border-line bg-white hover:bg-paper-2'
                  }`}
                >
                  <p className="font-medium text-sm text-ink-1">{label}</p>
                  <p className="text-xs text-ink-4 mt-0.5">{desc}</p>
                </button>
              ))}
            </div>

            {plansStatus && (
              <Button onClick={() => setCurrentStep(4)} className="w-full">
                Continue
              </Button>
            )}
          </div>
        )}

        {/* Step 4 — Domain profile */}
        {currentStep === 4 && (
          <div className="space-y-6 animate-[fadeIn_200ms_ease-out]">
            <div className="bubble-app">
              For each area, tell me roughly where {childName} is right now. Don't overthink it — you can always update this.
            </div>

            {DOMAIN_QUESTIONS.map(({ code, label, question }) => (
              <div key={code} className="card p-4">
                <p className="font-semibold text-sm text-ink-1 mb-1">{label}</p>
                <p className="text-sm text-ink-4 mb-3">{question}</p>
                <div className="flex flex-col gap-2">
                  {LEVEL_LABELS.map((levelLabel, i) => (
                    <button
                      key={i}
                      onClick={() => setDomainLevels((prev) => ({ ...prev, [code]: i }))}
                      className={`text-left px-3 py-2 rounded-sm text-sm border transition-colors duration-1 ${
                        domainLevels[code] === i
                          ? 'border-accent bg-accent-soft text-accent font-medium'
                          : 'border-line text-ink-3 hover:bg-paper-2'
                      }`}
                    >
                      {levelLabel}
                    </button>
                  ))}
                </div>
              </div>
            ))}

            <Button
              onClick={() => setCurrentStep(5)}
              className="w-full"
              disabled={Object.keys(domainLevels).length < DOMAIN_QUESTIONS.length}
            >
              Continue
            </Button>
          </div>
        )}

        {/* Step 5 — Goals */}
        {currentStep === 5 && (
          <div className="space-y-5 animate-[fadeIn_200ms_ease-out]">
            <div className="bubble-app">
              Almost done. A few last things that will make {childName}'s first plan really specific.
            </div>

            <div>
              <label className="text-sm font-medium text-ink-2 block mb-1.5">
                What do you most want help with right now?
              </label>
              <p className="text-xs text-ink-4 mb-2">Up to 3 things, one per line</p>
              <textarea
                value={goals}
                onChange={(e) => setGoals(e.target.value)}
                placeholder="e.g. Meltdowns after school&#10;Not wanting to go to therapy&#10;Making friends"
                rows={4}
                className="w-full rounded-sm border border-line-strong bg-white px-3 py-2 text-base text-ink-2 placeholder:text-ink-4 focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 resize-none"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-ink-2 block mb-1.5">
                What has definitely NOT worked?
              </label>
              <textarea
                value={hasntWorked}
                onChange={(e) => setHasntWorked(e.target.value)}
                placeholder="e.g. Token charts, forcing eye contact, social stories alone"
                rows={3}
                className="w-full rounded-sm border border-line-strong bg-white px-3 py-2 text-base text-ink-2 placeholder:text-ink-4 focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 resize-none"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-ink-2 block mb-1.5">
                What are {childName}'s favorite things?
              </label>
              <p className="text-xs text-ink-4 mb-2">Comma-separated, up to 5</p>
              <input
                type="text"
                value={interests}
                onChange={(e) => setInterests(e.target.value)}
                placeholder="e.g. Minecraft, dogs, trains, ocean animals"
                className="w-full rounded-sm border border-line-strong bg-white px-3 py-2 text-base text-ink-2 placeholder:text-ink-4 focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
              />
            </div>

            <Button onClick={finish} className="w-full" loading={loading} size="lg">
              Build my first plan
            </Button>
          </div>
        )}

        {/* Back button */}
        {currentStep > 2 && (
          <button
            onClick={() => setCurrentStep((s) => (s - 1) as Step)}
            className="mt-4 text-sm text-ink-4 hover:text-ink-2 transition-colors"
          >
            ← Back
          </button>
        )}
      </div>
    </div>
  )
}
