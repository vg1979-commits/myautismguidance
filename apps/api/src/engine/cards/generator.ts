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

// Keywords that indicate Tier 1 safety concerns requiring escalation.
// 'hurt' is intentionally excluded — it produces false positives on emotional language
// ("she is hurt that..."). 'hurting' still catches active physical harm.
export const SAFETY_KEYWORDS = [
  'hit', 'hitting', 'bite', 'biting', 'scratch', 'scratching',
  'self-harm', 'self harm', 'hurting', 'sib',
  'aggression', 'aggressive', 'head-bang', 'head bang',
  'threw', 'throwing', 'violent', 'destroy', 'destroying',
]

export function hasSafetyFlag(triggers: string[]): boolean {
  const joined = triggers.join(' ').toLowerCase()
  return SAFETY_KEYWORDS.some((kw) => joined.includes(kw))
}

function dir(signal: Signal, domain: string): string {
  return signal.domain_direction[domain] ?? 'unknown'
}

// ── Strength card (always first when strengths present) ───────────────────────

function strengthCard(signal: Signal): CandidateCard | null {
  if (signal.strengths_mentioned.length === 0) return null
  const strength = signal.strengths_mentioned[0]
  return {
    slotType: 'strength',
    domainCode: 'communication',
    setting: 'home',
    title: `Build on what's working: ${strength}`,
    strategyText: `${strength} is a genuine strength worth amplifying. Intentionally creating moments where this shines builds confidence and provides a foundation for harder skills.`,
    scriptText: `"I noticed you ${strength} — that really helps. Let's do more of that."`,
    watchForPositive: ['Child references the strength independently', 'Increased confidence in related areas'],
    watchForNegative: [],
    whyNow: `You mentioned ${strength} as a positive this week. Strength-first planning improves engagement with challenges throughout the week.`,
  }
}

// ── Regulation rules ─────────────────────────────────────────────────────────

function regulationCards(signal: Signal): CandidateCard[] {
  const cards: CandidateCard[] = []
  const { triggers_mentioned, setting_of_concern } = signal
  const d = dir(signal, 'regulation')

  if (d === 'deteriorating' || setting_of_concern.includes('home')) {
    cards.push({
      slotType: 'home-strategy',
      domainCode: 'regulation',
      setting: 'home',
      title: 'Add a 5-minute warning before every transition',
      strategyText: 'Unexpected transitions are a leading dysregulation trigger. A consistent verbal (and visual) warning gives the nervous system time to prepare and reduces the surprise response.',
      scriptText: `"Five more minutes, then we're switching to [next activity]. I'll let you know when it's time."`,
      watchForPositive: ['Smoother transitions with less protest', 'Child begins preparing before the warning ends'],
      watchForNegative: ['Still dysregulating — extend to 10 minutes or add a visual timer'],
      whyNow: `You described regulation challenges this week${triggers_mentioned.length > 0 ? `, particularly around ${triggers_mentioned[0]}` : ''}. Transition warnings directly target the most common regulation trigger.`,
    })
  }

  if (d === 'deteriorating') {
    cards.push({
      slotType: 'home-strategy',
      domainCode: 'regulation',
      setting: 'home',
      title: 'Practice co-regulation: name the feeling first',
      strategyText: "Before problem-solving, name the emotion you observe. This activates the child's language brain and reduces the intensity of the emotional response — a prerequisite for problem-solving.",
      scriptText: `"It looks like you're feeling frustrated right now. That makes sense. Let's figure this out together."`,
      watchForPositive: ['Child begins to name their own feelings', 'Escalations resolve faster'],
      watchForNegative: ["Child rejects the label — try 'your body looks tense' instead of naming the emotion"],
      whyNow: 'Regulation is deteriorating this week. Co-regulation is the Tier 1 support before any other strategies.',
    })
  }

  return cards
}

// ── Communication rules ───────────────────────────────────────────────────────

function communicationCards(signal: Signal): CandidateCard[] {
  const cards: CandidateCard[] = []
  const d = dir(signal, 'communication')

  cards.push({
    slotType: 'home-strategy',
    domainCode: 'communication',
    setting: 'home',
    title: 'Use interest-based conversation starters',
    strategyText: "Children with ASD communicate most fluently about topics they're passionate about. Using these as entry points for turn-taking practice links genuine motivation to communication development.",
    scriptText: '"Tell me more about that. What was your favorite part?"',
    watchForPositive: ['Longer exchanges', 'Child initiates topics more often', 'Eye contact during preferred topic'],
    watchForNegative: ['Scripted responses only — try open-ended questions about specific details'],
    whyNow: d === 'deteriorating'
      ? 'Communication is harder this week. Starting from a place of genuine interest reduces pressure and re-opens the channel.'
      : 'Reinforcing communication gains through interests consolidates momentum.',
  })

  if (d === 'deteriorating') {
    cards.push({
      slotType: 'home-strategy',
      domainCode: 'communication',
      setting: 'home',
      title: 'Offer choices instead of open questions',
      strategyText: 'Open-ended questions ("what do you want?") can overload processing. Offering two clear choices reduces the cognitive demand and increases successful communication exchanges.',
      scriptText: '"Do you want the red one or the blue one?" — wait 5 seconds for a response.',
      watchForPositive: ['More frequent responses', 'Child begins to offer alternatives beyond the two choices'],
      watchForNegative: ['Still not responding — reduce to single yes/no choices or use visuals'],
      whyNow: 'When communication is deteriorating, simplifying the input format often unlocks more output.',
    })
  }

  return cards
}

// ── Social rules ─────────────────────────────────────────────────────────────

function socialCards(signal: Signal): CandidateCard[] {
  const cards: CandidateCard[] = []
  const { setting_of_concern } = signal
  const d = dir(signal, 'social')

  if (setting_of_concern.includes('school')) {
    cards.push({
      slotType: 'school-request',
      domainCode: 'social',
      setting: 'school',
      title: 'Request structured peer interaction time',
      strategyText: 'Unstructured social time (recess, lunch) is hardest for most autistic children. Requesting structured, activity-based peer time provides a scaffold for successful interaction.',
      scriptText: '"Could we arrange a structured activity with one peer this week — maybe a shared game or project during lunch?"',
      watchForPositive: ['Child mentions the peer by name', 'Asks to repeat the activity'],
      watchForNegative: ['Still avoiding — ask the counselor about a social skills group'],
      whyNow: 'School social settings came up as a concern this week. Structured peer interaction is the evidence-based entry point.',
    })
  }

  if (d === 'deteriorating' && !setting_of_concern.includes('school')) {
    cards.push({
      slotType: 'home-strategy',
      domainCode: 'social',
      setting: 'home',
      title: 'Practice social scripts for common situations',
      strategyText: 'Scripted responses for greetings, requests, and interruptions reduce the real-time social processing load. Rehearsing at home builds automaticity before using them in the wild.',
      scriptText: '"Let\'s practice. When someone says \'how are you?\' try: \'I\'m okay, thanks. How about you?\'"',
      watchForPositive: ['Child uses the script unprompted', 'Script generalises to similar situations'],
      watchForNegative: ['Rigid script use — practice variations to increase flexibility'],
      whyNow: 'Social skills are harder this week. Scripting removes the real-time processing burden.',
    })
  }

  return cards
}

// ── Sensory rules ─────────────────────────────────────────────────────────────

function sensoryCards(signal: Signal): CandidateCard[] {
  const cards: CandidateCard[] = []
  const { triggers_mentioned, setting_of_concern } = signal

  cards.push({
    slotType: 'home-strategy',
    domainCode: 'sensory',
    setting: 'home',
    title: 'Build in a sensory break before high-demand tasks',
    strategyText: 'A short sensory regulation activity (jumping, heavy work, or quiet time) before homework or transitions primes the nervous system for focus and reduces protest behaviour.',
    scriptText: `"Before we start homework, let's do five minutes of [preferred sensory activity] to get your body ready."`,
    watchForPositive: ['Better focus during homework', 'Child requests the break proactively'],
    watchForNegative: ['No change — try a different sensory modality (proprioceptive vs vestibular vs deep pressure)'],
    whyNow: `Sensory processing came up this week${triggers_mentioned.length > 0 ? ` around ${triggers_mentioned[0]}` : ''}. Proactive regulation is more effective than reactive management.`,
  })

  if (setting_of_concern.includes('school')) {
    cards.push({
      slotType: 'school-request',
      domainCode: 'sensory',
      setting: 'school',
      title: 'Request sensory accommodations in the classroom',
      strategyText: 'Classroom sensory overload (noise, lighting, proximity to others) directly impacts learning and regulation. A brief conversation with the teacher about low-cost accommodations can make a significant difference.',
      scriptText: '"Could we explore some sensory supports at school — like a fidget tool, seating near a wall, or ear defenders during loud transitions?"',
      watchForPositive: ['Child reports school is "less loud"', 'Teacher notes fewer in-class disruptions'],
      watchForNegative: ['Accommodations not being implemented — request a brief 10-min meeting to follow up'],
      whyNow: 'Sensory concerns in a school setting came up this week. Environmental accommodations are often the highest-leverage, lowest-effort intervention.',
    })
  }

  return cards
}

// ── ADL (Activities of Daily Living) rules ────────────────────────────────────

function adlCards(signal: Signal): CandidateCard[] {
  const cards: CandidateCard[] = []
  const d = dir(signal, 'adl')
  const { triggers_mentioned, caregiver_tone } = signal

  // Visual routine board — first-line for ADL difficulties
  cards.push({
    slotType: 'home-strategy',
    domainCode: 'adl',
    setting: 'home',
    title: 'Create a visual routine board for morning or bedtime',
    strategyText: 'Visual step-by-step sequences remove the need for repeated verbal prompting and help children internalise routines. Even a hand-drawn 4-step sequence on the bathroom mirror reduces daily conflict.',
    scriptText: '"Let\'s check the board — what\'s step one? Great, now step two."',
    watchForPositive: ['Child moves to next step without prompting', 'Morning/evening time shortens', 'Less adult direction needed'],
    watchForNegative: ['Child ignoring the board — try adding photos of the child completing each step'],
    whyNow: d === 'deteriorating'
      ? 'Daily living skills are harder this week. Visual routines reduce the verbal load on both you and your child.'
      : 'A visual routine board supports independence in daily tasks and reduces caregiver prompting over time.',
  })

  // Sensory clothing — if triggers suggest clothing/dressing issues
  const clothingKeywords = ['clothes', 'clothing', 'dressing', 'getting dressed', 'shirt', 'tags', 'socks', 'shoes']
  const hasClothingTrigger = triggers_mentioned.some((t) =>
    clothingKeywords.some((kw) => t.toLowerCase().includes(kw))
  )

  if (hasClothingTrigger || d === 'deteriorating') {
    cards.push({
      slotType: 'home-strategy',
      domainCode: 'adl',
      setting: 'home',
      title: 'Offer sensory-friendly clothing choices the night before',
      strategyText: 'Morning dressing battles are often sensory-driven, not behavioural. Removing tags, choosing seamless socks, and pre-selecting two outfit options the night before eliminates the morning negotiation entirely.',
      scriptText: '"Tonight, let\'s pick two outfits you\'re comfortable in. Tomorrow morning you choose which one."',
      watchForPositive: ['Dressing time shortens', 'Child initiates clothing selection', 'Fewer morning meltdowns'],
      watchForNegative: ['Still refusing — try seamless/tagless garments or occupational therapy referral for sensory assessment'],
      whyNow: 'Dressing or clothing sensitivities appear in what you\'ve described this week. Pre-selection the night before removes morning decision fatigue.',
    })
  }

  // Backward chaining for hygiene — recommended for multi-step skills
  if (!hasClothingTrigger && cards.length < 2 && caregiver_tone !== 'overwhelmed') {
    cards.push({
      slotType: 'home-strategy',
      domainCode: 'adl',
      setting: 'home',
      title: 'Teach hygiene steps backwards (backward chaining)',
      strategyText: "Backward chaining — completing all steps for the child except the last, letting the child finish — builds success into every practice. The child always experiences completion, which is more motivating than being stopped mid-task.",
      scriptText: '"I\'ll help you with everything, and you do the last step — rinse and spit. Ready?"',
      watchForPositive: ['Child completes the final step independently', 'Begins requesting to do "their step"'],
      watchForNegative: ['Resistance to involvement — break the final step into smaller pieces first'],
      whyNow: 'Building ADL independence through small, achievable steps reduces daily caregiver burden over time.',
    })
  }

  return cards
}

// ── Academics rules ───────────────────────────────────────────────────────────

function academicsCards(signal: Signal): CandidateCard[] {
  const cards: CandidateCard[] = []
  const d = dir(signal, 'academics')
  const { setting_of_concern, caregiver_tone } = signal

  // Homework decompression — always relevant when academics mentioned
  cards.push({
    slotType: 'home-strategy',
    domainCode: 'academics',
    setting: 'home',
    title: 'Build a 20-minute decompression window before homework',
    strategyText: "After a full school day of masking, social processing, and academic effort, the child's regulatory capacity is depleted. A 20-minute unstructured break before homework reduces meltdowns and improves work quality.",
    scriptText: '"School\'s done — 20 minutes of free time, then we\'ll start homework. I\'ll set the timer."',
    watchForPositive: ['Homework starts with less resistance', 'Better work quality after the break', 'Child begins timing the break independently'],
    watchForNegative: ['20 minutes extends to non-stop avoidance — try a visual timer and a clear "homework station"'],
    whyNow: d === 'deteriorating'
      ? 'Academics are harder this week. Decompression before homework directly reduces the regulatory barrier to engagement.'
      : 'Academic engagement is on the agenda this week. The decompression window is the highest-leverage homework hack.',
  })

  // Teacher check-in request — when school is a concern
  if (setting_of_concern.includes('school')) {
    cards.push({
      slotType: 'school-request',
      domainCode: 'academics',
      setting: 'school',
      title: 'Ask for a brief daily teacher check-in',
      strategyText: 'A 2-minute end-of-day check-in (verbal or written note) between teacher and child creates a connection point, surfaces problems early, and gives the child a predictable closing routine to the school day.',
      scriptText: '"Would it be possible to have a quick daily check-in at the end of school — even just a thumbs up / thumbs down note home?"',
      watchForPositive: ['Child references the check-in at home', 'Teacher surfaces specific observations', 'Child\'s anxiety about school reduces'],
      watchForNegative: ['Teacher not following through — request it be added to the IEP or 504 as a listed accommodation'],
      whyNow: 'School academic concerns came up this week. A daily check-in is low-cost for teachers and high-value for early problem identification.',
    })
  }

  // Simplified task format — for overwhelmed caregivers or academic deterioration
  if (d === 'deteriorating' || caregiver_tone === 'overwhelmed') {
    cards.push({
      slotType: 'school-request',
      domainCode: 'academics',
      setting: 'school',
      title: 'Request chunked assignments instead of multi-page tasks',
      strategyText: 'Multi-step academic tasks can overwhelm working memory and initiation. Requesting that assignments be broken into discrete, checkable chunks allows the child to experience completion and re-engage with momentum.',
      scriptText: '"Could homework be broken into smaller sections with a check box between each? It helps with task initiation and completion."',
      watchForPositive: ['Child starts assignments without prompting', 'Fewer incomplete submissions'],
      watchForNegative: ['School declining — consider requesting this formally through the IEP or 504 process'],
      whyNow: 'Chunked tasks directly address the task-initiation barrier that comes with academic difficulty.',
    })
  }

  return cards
}

// ── Behavior rules ────────────────────────────────────────────────────────────

function behaviorCards(signal: Signal): CandidateCard[] {
  const cards: CandidateCard[] = []
  const { triggers_mentioned, setting_of_concern } = signal
  const d = dir(signal, 'behavior')
  const safetyFlag = hasSafetyFlag(triggers_mentioned)

  // Tier 1: Safety escalation — overrides all other behavior cards
  if (safetyFlag) {
    cards.push({
      slotType: 'safety',
      domainCode: 'behavior',
      setting: 'therapy',
      title: 'Discuss safety behavior patterns with your provider this week',
      strategyText: 'When behaviors involve physical harm (to self or others), sharing these observations with your ABA therapist, paediatrician, or behaviour specialist is the most important next step. Document the antecedent, behaviour, and consequence so the provider has specific information to work from.',
      scriptText: '"This week I noticed [specific behavior] happening when [trigger]. I want to make sure we have a plan."',
      watchForPositive: ['Provider adjusts the behavior support plan', 'Frequency or intensity reduces with new strategy'],
      watchForNegative: ['If behavior escalates or someone is being injured, seek same-week clinical contact'],
      whyNow: `You mentioned behaviors that may involve physical safety this week. These always belong in Tier 1 — provider-aligned planning takes priority over home strategies.`,
    })

    // Also add an immediate de-escalation card alongside the therapy card
    cards.push({
      slotType: 'home-strategy',
      domainCode: 'behavior',
      setting: 'home',
      title: 'Use a calm-down kit during escalations',
      strategyText: 'A pre-prepared calm-down kit (sensory tools, favourite object, water, a visual "I need space" card) gives the child agency during escalation and reduces the need for verbal redirection — which often increases arousal.',
      scriptText: '"Your calm-down box is right here when you need it. I\'ll sit nearby."',
      watchForPositive: ['Child reaches for kit before full escalation', 'Duration of escalations shortens'],
      watchForNegative: ['Kit being thrown or rejected — simplify contents and ensure child helps select items when calm'],
      whyNow: 'A structured de-escalation tool provides an immediate home response while provider support is being coordinated.',
    })

    return cards // Return early — safety cards take the full plan
  }

  // Non-safety behavior: function identification
  if (d === 'deteriorating' || d === 'unknown') {
    cards.push({
      slotType: 'home-strategy',
      domainCode: 'behavior',
      setting: 'home',
      title: 'Track the ABC pattern: what happens before and after',
      strategyText: 'Behavior has a function — it communicates something the child cannot yet express verbally. Tracking the Antecedent (what happened before), Behavior (what it looked like), and Consequence (what happened after) for 3–4 incidents reveals the function and the right response.',
      scriptText: 'Write down: BEFORE [what was happening] → BEHAVIOR [what it looked like, how long] → AFTER [what you did, how the child responded]. Share with your therapist.',
      watchForPositive: ['Pattern becomes visible after 3+ incidents', 'Trigger identified and pre-empted'],
      watchForNegative: ['Pattern unclear — share log with ABA or behaviour specialist for functional analysis'],
      whyNow: `Behavior patterns came up this week${triggers_mentioned.length > 0 ? ` around ${triggers_mentioned[0]}` : ''}. Function-based tracking is the foundation for sustainable change.`,
    })
  }

  // Extinction burst warning — always helpful when behavior is active
  if (d === 'deteriorating' || d === 'stable') {
    cards.push({
      slotType: 'home-strategy',
      domainCode: 'behavior',
      setting: 'home',
      title: 'Prepare for an extinction burst when starting a new strategy',
      strategyText: "When a behaviour that previously worked stops getting the expected result, children often escalate — briefly and intensely — before the behaviour reduces. This 'extinction burst' is a sign the strategy is working, not failing. Consistency through the burst is critical.",
      scriptText: '"This might get harder before it gets easier. That\'s normal. We stay calm, stay consistent."',
      watchForPositive: ['Behaviour peaks and then begins to reduce over 5–7 days', 'Child finds an alternative strategy'],
      watchForNegative: ['Burst extending beyond 2 weeks without reduction — review the function and strategy with your therapist'],
      whyNow: 'If you\'re starting or changing a response strategy this week, knowing the extinction burst is coming helps you stay consistent through it.',
    })
  }

  if (setting_of_concern.includes('school') && (d === 'deteriorating' || d === 'unknown')) {
    cards.push({
      slotType: 'school-request',
      domainCode: 'behavior',
      setting: 'school',
      title: 'Request school behavior data for the last two weeks',
      strategyText: 'Home and school behaviour can diverge significantly. Requesting the teacher\'s observation data (incident notes, frequency counts, or a simple behaviour chart) gives you a full picture and ensures both settings are working from the same understanding.',
      scriptText: '"Could you share any behaviour data or incident notes from the past two weeks? I\'m tracking a pattern and would love to compare notes."',
      watchForPositive: ['School and home patterns align', 'Teacher identifies a school-specific trigger you weren\'t aware of'],
      watchForNegative: ['No data kept — ask if the behaviour specialist can do a brief classroom observation'],
      whyNow: 'Behaviour concerns at school came up this week. Cross-setting data is essential for understanding whether this is a setting-specific or cross-setting pattern.',
    })
  }

  return cards
}

// ── Executive Function rules ─────────────────────────────────────────────────

function executiveFunctionCards(signal: Signal): CandidateCard[] {
  const cards: CandidateCard[] = []
  const { setting_of_concern } = signal
  const d = dir(signal, 'executive-function')

  // Visual timer for task initiation — highest impact EF card
  cards.push({
    slotType: 'home-strategy',
    domainCode: 'executive-function',
    setting: 'home',
    title: 'Use a visual timer for task initiation',
    strategyText: "Abstract time (\"in five minutes\") is nearly impossible for many autistic children to process. A visible timer — where time shrinking is visible — makes the countdown concrete and reduces the initiation barrier by removing \"how long?\" from the equation.",
    scriptText: '"I\'m setting the timer for 5 minutes. When it goes off, we start. You can watch it count down."',
    watchForPositive: ['Child starts without reminders when timer ends', 'Negotiates timer duration independently'],
    watchForNegative: ['Timer creates anxiety — try a sand timer or a clock with a marked hand instead of a digital countdown'],
    whyNow: d === 'deteriorating'
      ? 'Executive function is harder this week. Visual timers are the single highest-impact low-tech EF support.'
      : 'A visual timer supports task initiation across all daily demands — homework, transitions, and morning routines.',
  })

  // First-then board / change card
  if (d === 'deteriorating') {
    cards.push({
      slotType: 'home-strategy',
      domainCode: 'executive-function',
      setting: 'home',
      title: 'Use a first-then board for transitions between activities',
      strategyText: 'The first-then framework ("First [non-preferred], then [preferred]") makes expectations concrete, links effort to reward, and reduces the ambiguity that drives transition refusals. Keep it visual and visible — one card for "first," one for "then."',
      scriptText: '"First homework, then Minecraft. Let\'s put it on the board so you can see it."',
      watchForPositive: ['Child refers to the board independently', 'Transition resistance reduces', 'Child begins using first-then language themselves'],
      watchForNegative: ['Preferred activity being withheld too often — ensure "then" is always achievable same-day'],
      whyNow: 'Executive function challenges this week are affecting transitions. The first-then board directly externalises what the brain is struggling to hold internally.',
    })
  }

  // School organisation support
  if (setting_of_concern.includes('school')) {
    cards.push({
      slotType: 'school-request',
      domainCode: 'executive-function',
      setting: 'school',
      title: 'Request a visual daily schedule in the classroom',
      strategyText: 'Not knowing what comes next is a significant anxiety source for autistic students. A personal visual schedule (posted on the desk or in an agenda) externalises working memory demands and gives the child a way to self-orient throughout the day.',
      scriptText: '"Could my child have a personal visual schedule at their desk showing the day\'s order? Even a simple printed sheet would help."',
      watchForPositive: ['Child checks the schedule independently', 'Transition anxiety at school reduces', 'Teacher reports fewer "what are we doing?" interruptions'],
      watchForNegative: ['Schedule not being kept updated — ask if it can be a morning classroom routine for the whole class'],
      whyNow: 'Executive function at school came up this week. A personal visual schedule is the foundational school-based EF support — and nearly always a viable classroom accommodation.',
    })
  }

  // Task checklist — complement to visual timer
  if (d === 'deteriorating' && !setting_of_concern.includes('school')) {
    cards.push({
      slotType: 'home-strategy',
      domainCode: 'executive-function',
      setting: 'home',
      title: 'Make a physical checklist for multi-step tasks',
      strategyText: 'Multi-step tasks (getting ready, tidying up) overload working memory. A physical checklist with boxes to check off externalises the sequence, provides a clear endpoint, and gives a sense of completion at each step — which is intrinsically motivating.',
      scriptText: '"Here\'s your checklist. Check each box when you\'re done, and show me when you get to the bottom."',
      watchForPositive: ['Child works through checklist with less prompting', 'Begins adding items to their own list'],
      watchForNegative: ['List too long — keep to 5 items maximum per checklist, break into two separate lists if needed'],
      whyNow: 'A task checklist directly offloads the working memory demand that is creating the most friction this week.',
    })
  }

  return cards
}

// ── Community setting cards ───────────────────────────────────────────────────

function communityCards(signal: Signal): CandidateCard[] {
  const cards: CandidateCard[] = []
  if (!signal.setting_of_concern.includes('community')) return cards

  cards.push({
    slotType: 'community-strategy',
    domainCode: 'regulation',
    setting: 'community',
    title: 'Create a community outing preparation routine',
    strategyText: 'Community environments (shops, events, restaurants) present unpredictable sensory and social demands. A consistent preparation routine — reviewing what to expect, identifying an exit plan, and packing a sensory kit — significantly reduces outings-related dysregulation.',
    scriptText: '"Before we go, let\'s look at a photo of where we\'re going. If it gets too much, we\'ll use our quiet signal and find a calm spot."',
    watchForPositive: ['Child asks to review the plan before outings', 'Outings extend without needing to leave early', 'Child identifies their own "too much" signal'],
    watchForNegative: ['Outings still too difficult — consider shorter visits to familiar places first to rebuild confidence'],
    whyNow: 'Community settings came up as a concern this week. A pre-outing routine is the most effective way to reduce unpredictability-driven dysregulation in public.',
  })

  cards.push({
    slotType: 'community-strategy',
    domainCode: 'sensory',
    setting: 'community',
    title: 'Pack a portable sensory regulation kit for outings',
    strategyText: 'A small bag with two or three known sensory tools (noise-cancelling headphones, a favourite small object, sunglasses, chewing gum) gives the child a mobile regulation toolkit for unpredictable sensory environments.',
    scriptText: '"You\'re in charge of the calm bag. What do you want to put in it for today\'s trip?"',
    watchForPositive: ['Child reaches for the kit before escalating', 'Independently requests specific items before outings'],
    watchForNegative: ['Child not using the kit in the moment — practice using each item at home first, in calm states'],
    whyNow: 'Having a physical, portable kit changes outings from unprepared to prepared — which changes the caregiver experience too.',
  })

  return cards
}

// ── Therapy alignment card ────────────────────────────────────────────────────

function therapyAlignmentCard(signal: Signal): CandidateCard | null {
  if (!signal.setting_of_concern.includes('therapy')) return null

  return {
    slotType: 'therapy-bridge',
    domainCode: signal.domains_mentioned[0] as DomainCode ?? 'regulation',
    setting: 'therapy',
    title: "Share this week's observations with your therapy provider",
    strategyText: 'What you\'re observing at home is clinical gold for your therapy provider. A brief written summary — even 3 bullet points — shared before or after the session ensures therapy targets match what\'s actually happening at home right now.',
    scriptText: '"This week I noticed: [1–3 specific observations]. I\'d love to work on [specific goal] during our next session."',
    watchForPositive: ['Provider adjusts session targets based on home data', 'Skills generalise from therapy to home more quickly'],
    watchForNegative: ['Provider seems disconnected from home reality — ask explicitly about home-practice goals each session'],
    whyNow: 'Therapy came up as a relevant setting this week. Home-therapy alignment is one of the highest predictors of skill generalisation.',
  }
}

// ── Fallback card (used when fewer than 3 cards generated) ────────────────────

function fallbackCard(): CandidateCard {
  return {
    slotType: 'home-strategy',
    domainCode: 'regulation',
    setting: 'home',
    title: 'Build in one predictable "special time" each day',
    strategyText: "10–15 minutes of child-led play — where the child chooses and leads the activity and the caregiver follows without directing — builds secure connection, reduces attention-seeking behaviour, and fills the child's social-emotional bucket.",
    scriptText: '"This is your time. You pick what we do. I\'ll follow your lead."',
    watchForPositive: ['Child references special time and looks forward to it', 'Connection-seeking behaviour reduces outside of special time'],
    watchForNegative: ['Child cannot sustain child-led play — start with 5 minutes and increase gradually'],
    whyNow: 'Consistent child-led connection time supports regulation, communication, and social development across all domains.',
  }
}

// ── Main entry point ──────────────────────────────────────────────────────────

export function generateCandidateCards(signal: Signal): CandidateCard[] {
  const { domains_mentioned, caregiver_tone } = signal
  const cards: CandidateCard[] = []

  // Strength card always goes first
  const strength = strengthCard(signal)
  if (strength) cards.push(strength)

  // Behavior safety check — if safety flag, return immediately with safety plan
  if (domains_mentioned.includes('behavior') && hasSafetyFlag(signal.triggers_mentioned)) {
    const safety = behaviorCards(signal)
    return [...cards, ...safety].slice(0, 6)
  }

  // Domain-specific rules — generate all candidates
  if (domains_mentioned.includes('regulation'))         cards.push(...regulationCards(signal))
  if (domains_mentioned.includes('communication'))      cards.push(...communicationCards(signal))
  if (domains_mentioned.includes('social'))             cards.push(...socialCards(signal))
  if (domains_mentioned.includes('sensory'))            cards.push(...sensoryCards(signal))
  if (domains_mentioned.includes('adl'))                cards.push(...adlCards(signal))
  if (domains_mentioned.includes('academics'))          cards.push(...academicsCards(signal))
  if (domains_mentioned.includes('behavior'))           cards.push(...behaviorCards(signal))
  if (domains_mentioned.includes('executive-function')) cards.push(...executiveFunctionCards(signal))

  // Setting-triggered cards (community prep, therapy bridge)
  cards.push(...communityCards(signal))
  const therapyCard = therapyAlignmentCard(signal)
  if (therapyCard) cards.push(therapyCard)

  // Capacity modifier: overwhelmed caregivers get max 3 cards, simplest first
  if (caregiver_tone === 'overwhelmed') {
    const prioritised = cards.filter(
      (c) => c.slotType === 'strength' || c.domainCode === 'regulation' || c.domainCode === 'behavior'
    )
    const rest = cards.filter((c) => !prioritised.includes(c))
    return [...prioritised, ...rest].slice(0, 3)
  }

  // Ensure at least 3 cards
  while (cards.length < 3) {
    cards.push(fallbackCard())
  }

  return cards.slice(0, 6)
}
