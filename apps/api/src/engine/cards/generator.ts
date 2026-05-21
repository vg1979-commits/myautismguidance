import { v4 as uuidv4 } from 'uuid'
import type { DomainCode } from '@myautismguidance/shared-types'

interface Signal {
  domains_mentioned: string[]
  domain_direction: Record<string, string>
  setting_of_concern: string[]
  triggers_mentioned: string[]
  strengths_mentioned: string[]
  caregiver_tone: string
}

interface CandidateCard {
  slotType: string
  domainCode: DomainCode
  setting: string
  title: string
  strategyText: string
  scriptText: string
  watchForPositive: string[]
  watchForNegative: string[]
  whyNow: string
}

// Rule-based card generation from signals
export function generateCandidateCards(signal: Signal): CandidateCard[] {
  const cards: CandidateCard[] = []
  const { domains_mentioned, domain_direction, setting_of_concern, triggers_mentioned, caregiver_tone } = signal

  // Always add strength card if strengths mentioned
  if (signal.strengths_mentioned.length > 0) {
    cards.push({
      slotType: 'strength',
      domainCode: 'communication',
      setting: 'home',
      title: `Build on what's working: ${signal.strengths_mentioned[0]}`,
      strategyText: `Your child's strength in ${signal.strengths_mentioned[0]} is a real asset. Intentionally leverage it in daily interactions to build confidence and reinforce what's working.`,
      scriptText: `"I noticed you ${signal.strengths_mentioned[0]} — that's exactly the kind of thing that helps."`,
      watchForPositive: ['Child references the strength independently', 'Increased confidence in related areas'],
      watchForNegative: [],
      whyNow: `You mentioned ${signal.strengths_mentioned[0]} as a positive this week. Strength-first planning improves engagement with challenges.`,
    })
  }

  // Regulation-specific cards
  if (domains_mentioned.includes('regulation')) {
    const dir = domain_direction['regulation']
    if (dir === 'deteriorating' || setting_of_concern.includes('home')) {
      cards.push({
        slotType: 'home-strategy',
        domainCode: 'regulation',
        setting: 'home',
        title: 'Add a 5-minute warning before every transition',
        strategyText: 'Unexpected transitions are a leading trigger for dysregulation. A consistent 5-minute warning gives the nervous system time to prepare and reduces the surprise response.',
        scriptText: '"Five more minutes, then we\'re going to switch to [next activity]. I\'ll let you know when it\'s time."',
        watchForPositive: ['Smoother transitions with less protest', 'Child begins preparing before the warning ends'],
        watchForNegative: ['Still dysregulating — extend warning to 10 minutes', 'Ignoring verbal cues — try a visual timer'],
        whyNow: `You described regulation challenges this week${triggers_mentioned.length > 0 ? `, particularly around ${triggers_mentioned[0]}` : ''}. Transition warnings directly target the most common regulation trigger.`,
      })
    }
  }

  // Communication cards
  if (domains_mentioned.includes('communication')) {
    const dir = domain_direction['communication']
    cards.push({
      slotType: 'home-strategy',
      domainCode: 'communication',
      setting: 'home',
      title: 'Use interest-based conversation starters',
      strategyText: "Children with ASD communicate most fluently about topics they're passionate about. Use these as entry points for turn-taking practice — genuine interest drives genuine connection.",
      scriptText: '"Tell me more about that. What was your favorite part?"',
      watchForPositive: ['Longer exchanges', 'Child initiates topics more often', 'Eye contact during preferred topic'],
      watchForNegative: ['Scripted responses only — try open-ended questions about specifics'],
      whyNow: dir === 'deteriorating'
        ? 'Communication is harder this week. Starting from interest reduces pressure.'
        : 'Reinforcing communication gains through interests keeps momentum going.',
    })
  }

  // Social cards
  if (domains_mentioned.includes('social') && setting_of_concern.includes('school')) {
    cards.push({
      slotType: 'school-request',
      domainCode: 'social',
      setting: 'school',
      title: 'Request structured peer interaction time',
      strategyText: 'Unstructured social time (recess, lunch) is hardest for most autistic children. Requesting structured, activity-based peer time gives a scaffold for successful interaction.',
      scriptText: '"Could we try a structured activity with one peer during lunch — maybe a game or a shared interest?"',
      watchForPositive: ['Child mentions the peer by name', 'Asks to do it again'],
      watchForNegative: ['Still avoiding — consider asking the counselor for a social skills group'],
      whyNow: 'School social settings came up as a concern this week. Structured peer time is the evidence-based first step.',
    })
  }

  // Sensory cards
  if (domains_mentioned.includes('sensory')) {
    cards.push({
      slotType: 'home-strategy',
      domainCode: 'sensory',
      setting: 'home',
      title: 'Build in a sensory break before high-demand tasks',
      strategyText: "A short sensory regulation activity (jumping, heavy work, or quiet time) before homework or transitions primes the nervous system for focus and cooperation.",
      scriptText: '"Before we start homework, let\'s do five minutes of [preferred sensory activity] to get your body ready."',
      watchForPositive: ['Better focus during homework', 'Child requests the break proactively'],
      watchForNegative: ['No change — try a different sensory modality (proprioceptive vs vestibular)'],
      whyNow: 'Sensory processing came up this week. Proactive regulation is more effective than reactive management.',
    })
  }

  // If overwhelmed caregiver, cap at 3 cards and simplify
  if (caregiver_tone === 'overwhelmed') {
    return cards.slice(0, 3)
  }

  // Ensure minimum 3 cards
  if (cards.length < 3) {
    cards.push({
      slotType: 'home-strategy',
      domainCode: 'regulation',
      setting: 'home',
      title: 'Practice co-regulation: name the feeling first',
      strategyText: "Before problem-solving, name the emotion you observe. This simple step activates the child's language brain and reduces the intensity of the emotional response.",
      scriptText: '"It looks like you\'re feeling frustrated right now. That makes sense. Let\'s figure this out together."',
      watchForPositive: ['Child begins to name their own feelings', 'Escalations resolve faster'],
      watchForNegative: ['Child rejects the label — try "your body looks tense" instead of naming the emotion'],
      whyNow: 'Co-regulation is a foundational strategy that supports every other skill domain.',
    })
  }

  return cards.slice(0, 6)
}
